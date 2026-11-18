/**
 * subscriptionRecovery - phát hiện trạng thái "ĐÃ THANH TOÁN nhưng gói bị mất".
 *
 * ⚠️ BỐI CẢNH (19/11 - user báo: "đã thanh toán gói rồi, tắt app mở lại thì
 *    về gói Free mặc định"):
 *
 *   Chuỗi lỗi nằm 100% ở BE (KHÔNG sửa được vì ràng buộc dự án):
 *     1. `POST /subscriptions/subscribe` (`subscriptions.service.ts:145-160`)
 *        dùng `upsert` với nhánh `update` CHỈ set `pendingPlanId` + `status:
 *        'pending'` -> **`planId` KHÔNG đổi** (vẫn là gói free cũ).
 *     2. `GET /subscriptions/me` khi `status='pending'` trả `sub.plan` (resolve
 *        theo `planId` = gói free) -> user thấy "Gói Miễn Phí" dù đang mua.
 *     3. CHỈ `POST /subscriptions/webhook` (PayOS gọi về) mới ghi
 *        `planId = pendingPlanId` + `status='active'`. Ở local, tunnel ngrok
 *        chết / BE không chạy -> webhook KHÔNG về -> sub kẹt `pending`.
 *     4. Sau 15 phút, cron `PaymentTransactionsCron.cleanupExpired`
 *        (`payment-transactions.service.ts:112-124`) đặt
 *        `status='cancelled', pendingPlanId=null`.
 *     5. Lần mở app sau đó gọi `GET /subscriptions/me` -> không có sub
 *        `active`/`pending` -> BE gọi `assignFreePlan()`
 *        (`subscriptions.service.ts:399-424`) -> `upsert` ghi đè
 *        `planId = freePlan.id`, `status='active'` -> **xoá vĩnh viễn dấu vết
 *        gói đã mua**.
 *
 *   => Vì BE đã xoá sạch thông tin, client KHÔNG thể tự "khôi phục" gói.
 *      Client CHỈ có thể:
 *        a) KHÔNG để user bị hiểu nhầm là đã mất tiền -> hiện cảnh báo rõ.
 *        b) GIỮ cache gói đã mua để offline vẫn hiện đúng (không nhảy về free).
 *        c) CHO user mở lại QR đang dở để hoàn tất thanh toán.
 *
 * ⚠️ NGUYÊN TẮC "KHÔNG BỊA DỮ LIỆU":
 *   Mọi thông tin ở đây đến từ `GET /payment-transactions/me` (BE trả về
 *   `paidAt`, `amount`, `planName`, `paymentRef`) và `GET /subscriptions/me`.
 *   Không tự chế tên gói, giá tiền hay trạng thái.
 *
 * R7: comment tiếng Việt.
 */

/** Số ngày tối đa mà 1 gói trả phí còn hiệu lực (BE: endDate = hôm nay + 1 tháng). */
export const PLAN_TTL_DAYS = 35;

/**
 * Tên gói "free" chuẩn hoá.
 * BE dùng `name = 'free'`; mock dùng slug khác -> so sánh case-insensitive.
 *
 * @param {string|null|undefined} name
 * @returns {boolean}
 */
export const isFreePlanName = (name) => {
  if (!name) return true;
  return String(name).toLowerCase() === 'free';
};

/**
 * Lấy danh sách giao dịch từ shape của `getPaymentHistory()`
 * (`{ items, total, page, limit }`) hoặc mảng thô.
 *
 * @param {object|Array|null} paymentHistory
 * @returns {Array<object>}
 */
export const extractTransactions = (paymentHistory) => {
  if (Array.isArray(paymentHistory)) return paymentHistory;
  if (Array.isArray(paymentHistory?.items)) return paymentHistory.items;
  return [];
};

/**
 * Số ngày kể từ 1 mốc thời gian (ISO string) đến hiện tại.
 *
 * @param {string|null|undefined} iso
 * @param {number} [now]
 * @returns {number} số ngày (>= 0). Không parse được -> `Infinity`.
 */
export const daysSince = (iso, now = Date.now()) => {
  if (!iso) return Infinity;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return Infinity;
  return Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
};

/**
 * Giao dịch có giá trị > 0 (tức là gói trả phí, không phải gói free).
 *
 * @param {object} tx
 * @returns {boolean}
 */
export const isPaidPlanTransaction = (tx) => Number(tx?.amount) > 0;

/**
 * Phát hiện mismatch giữa lịch sử thanh toán và gói hiện tại.
 *
 * ⚠️ TRẢ VỀ `null` khi mọi thứ khớp nhau (không hiện cảnh báo).
 *
 * @param {object} params
 * @param {object|null} params.currentSub - kết quả `GET /subscriptions/me`
 * @param {object|Array|null} params.paymentHistory - kết quả `GET /payment-transactions/me`
 * @returns {null|{
 *   kind: 'payment_pending'|'reverted_to_free'|'payment_not_applied',
 *   planDisplayName: string|null,
 *   planName: string|null,
 *   amount: number|null,
 *   paymentRef: string|null,
 *   type: string|null,
 *   paidAt: string|null,
 *   daysAgo: number,
 * }}
 */
export const detectSubscriptionMismatch = ({ currentSub = null, paymentHistory = null } = {}) => {
  const txs = extractTransactions(paymentHistory);
  if (txs.length === 0) return null;

  const plan = currentSub?.plan ?? null;
  const currentPlanName = plan?.name ?? 'free';
  const currentIsFree = isFreePlanName(currentPlanName);
  const currentStatus = currentSub?.status ?? 'expired';

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 1: giao dịch ĐANG CHỜ của gói trả phí.
  //
  //   Khi user bấm "mua gói", BE set `status='pending'` nhưng KHÔNG đổi
  //   `planId` -> `GET /subscriptions/me` vẫn trả gói FREE. Nếu ta hiện
  //   "Gói Miễn Phí" như thể chưa từng mua -> user tưởng mất tiền.
  //   => Hiện "đang chờ thanh toán gói X" + cho mở lại QR đang dở.
  // ─────────────────────────────────────────────────────────────
  const pendingTx = txs.find((tx) => tx?.status === 'pending' && isPaidPlanTransaction(tx));
  if (pendingTx && currentIsFree) {
    return {
      kind: 'payment_pending',
      planDisplayName: pendingTx.planName ?? null,
      planName: null, // chưa biết slug -> caller tra trong `packages`
      amount: Number(pendingTx.amount) || null,
      paymentRef: pendingTx.paymentRef ?? null,
      type: pendingTx.type ?? null,
      paidAt: null,
      daysAgo: daysSince(pendingTx.createdAt),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 2: đã THANH TOÁN (tx `paid`) nhưng gói KHÔNG còn active.
  //
  //   Đây chính là bug user gặp: đã trả tiền, mở lại app -> về Free.
  //   Chỉ cảnh báo khi giao dịch Còn trong hạn (gói trả phí sống 1 tháng),
  //   nếu quá hạn thì việc về Free là HỢP LỆ (BE hạ cấp khi hết hạn).
  // ─────────────────────────────────────────────────────────────
  const paidTx = txs.find((tx) => tx?.status === 'paid' && isPaidPlanTransaction(tx));
  if (paidTx) {
    const paidAt = paidTx.paidAt ?? paidTx.createdAt ?? null;
    const age = daysSince(paidAt);
    const withinTtl = age <= PLAN_TTL_DAYS;

    const subUsable = currentStatus === 'active' && !currentIsFree;

    if (!subUsable && withinTtl) {
      return {
        kind: currentStatus === 'pending' ? 'payment_not_applied' : 'reverted_to_free',
        planDisplayName: paidTx.planName ?? null,
        planName: null,
        amount: Number(paidTx.amount) || null,
        paymentRef: paidTx.paymentRef ?? null,
        type: paidTx.type ?? null,
        paidAt,
        daysAgo: age,
      };
    }
  }

  return null;
};

/**
 * Tra cứu slug gói (`individual` | `family`) từ danh sách gói, theo displayName.
 *
 * @param {Array<object>} packages - kết quả `GET /subscriptions/plans`
 * @param {string|null|undefined} displayName - `tx.planName` của BE (= displayName)
 * @returns {string|null}
 */
export const findPlanNameByDisplayName = (packages, displayName) => {
  if (!displayName) return null;
  const target = String(displayName).trim().toLowerCase();
  const found = (Array.isArray(packages) ? packages : []).find(
    (pkg) => String(pkg?.displayName ?? '').trim().toLowerCase() === target
  );
  return found?.name ?? null;
};

export default detectSubscriptionMismatch;
