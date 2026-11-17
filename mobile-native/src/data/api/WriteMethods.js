/**
 * WriteMethods - phân loại method ĐỌC / GHI cho từng service.
 *
 * ⚠️ VÌ SAO CẦN BẢNG NÀY:
 *   Chính sách lỗi (Option B) xử lý ĐỌC và GHI khác nhau:
 *     - ĐỌC lỗi network -> đọc cache SQLite -> cache rỗng -> ném lỗi thật.
 *     - GHI  lỗi 5xx    -> ném lỗi thật (KHÔNG mock, KHÔNG queue).
 *     - GHI  lỗi network -> có mutation handler? -> queue + `OfflineQueuedError`
 *                          không có handler?      -> `OfflineRequiresNetworkError`.
 *   => `SafeService` cần biết method nào là GHI mới áp đúng nhánh.
 *
 * ⚠️ MẶC ĐỊNH AN TOÀN:
 *   Method KHÔNG có trong bảng -> coi là ĐỌC (giữ hành vi cũ, an toàn vì
 *   đọc không gây ra thao tác sai lệch). Muốn ép method nào là GHI thì
 *   thêm vào `WRITE_METHODS[serviceKey]`.
 *
 * ⚠️ DANH SÁCH LẤY TỪ CODE THẬT (không bịa):
 *   Đối chiếu `src/data/services/real/Real*Service.js`.
 *
 * R7: comment tiếng Việt.
 */

const asSet = (names) => new Set(names);

/**
 * Bảng method GHI theo service key.
 * Key khớp với `ServiceRegistry` (`fridgeService`, `recipeService`, ...).
 */
export const WRITE_METHODS = {
  fridgeService: asSet([
    'addItem',
    'updateItem',
    'markConsumed',
    'deleteItem',
    // Xác nhận kết quả scan -> ghi thêm nguyên liệu vào tủ.
    'confirmScan',
  ]),

  recipeService: asSet([
    'addBookmark',
    'removeBookmark',
    'toggleShoppingItemInList',
    'toggleShoppingItem',
    'addShoppingListItem',
    'updateShoppingListItem',
    'removeShoppingListItem',
    'createShoppingList',
    'updateSlot',
    'markSlotCooked',
    'updatePlan',
    'generatePlan',
    'generateFromExpiring',
    'regenerateSlot',
    'addSlotMissingToShoppingList',
  ]),

  notificationService: asSet([
    'markAsRead',
    'markAllAsRead',
    'deleteNotification',
    // Đăng ký FCM token -> ghi lên server.
    'registerFcmToken',
    'removeFcmToken',
  ]),

  userService: asSet([
    'updateProfile',
    'updatePreferences',
    'updateNotificationSettings',
    'addAllergy',
    'removeAllergy',
    'uploadAvatar',
    'submitOnboarding',
    // ── Nhóm tài chính / gia đình: KHÔNG có mutation handler ──
    // -> offline sẽ ném `OfflineRequiresNetworkError` (đúng yêu cầu
    //    "ghi trong nhóm tài chính/gia đình bị từ chối gracefully").
    'subscribe',
    'renewSubscription',
    'cancelAutoRenewal',
    'inviteFamilyMember',
    'acceptFamilyInvite',
    'rejectFamilyInvite',
    'removeFamilyMember',
    'dissolveFamilyGroup',
  ]),

  subscriptionService: asSet([
    'subscribe',
    'renew',
    'cancelAutoRenewal',
  ]),

  familyService: asSet([
    'inviteMember',
    'acceptInvite',
    'rejectInvite',
    'removeMember',
    'dissolveGroup',
  ]),
};

/**
 * Method này có phải method GHI không?
 *
 * @param {string} serviceKey - key của service (vd 'fridgeService')
 * @param {string} methodName - tên method
 * @returns {boolean} true = method GHI
 */
export const isWriteMethod = (serviceKey, methodName) => {
  if (!serviceKey || !methodName) return false;
  const set = WRITE_METHODS[serviceKey];
  if (!set) return false;
  return set.has(methodName);
};

export default WRITE_METHODS;
