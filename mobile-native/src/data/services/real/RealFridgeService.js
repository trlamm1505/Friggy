/**
 * RealFridgeService - nối tủ lạnh với BE thật (Sprint B1)
 *
 * Nguồn sự thật (Mục 7 - ưu tiên cao nhất):
 *   be/src/modules-api/fridge/dto/fridge.dto.ts         -> query + request DTO
 *   be/src/modules-api/fridge/dto/fridge-response.dto.ts -> response DTO
 *   be/src/modules-api/fridge/fridge.service.ts         -> hành vi thật
 *
 * ⚠️ BA SAI LẦM ĐÃ BIẾT (đừng phát hiện lại):
 *
 * 1. `ListFridgeQueryDto` CHỈ nhận `storageLocation` + `expiringSoon`.
 *    KHÔNG có `search`, `sortBy`, `sortDir`, `category`.
 *    => search + sort là CLIENT-SIDE trên list đã nằm trong RAM.
 *    => `expiringSoon` là filter DUY NHẤT để gọi server.
 *
 * 2. `FridgeItemResponseDto` KHÔNG trả `status` và KHÔNG trả `category`.
 *    - `status` -> tự tính từ `daysUntilExpiry` (BE có trả) hoặc từ `expiresAt`.
 *      Ưu tiên `daysUntilExpiry` vì BE đã tính sẵn — không tự tính lại giá trị BE đã trả.
 *    - `category` -> không có endpoint nào trả theo item, UI đã bỏ chip filter
 *      category (quyết định 23/10: theo Flutter, dùng 4 pill storage thay thế).
 *      Component tự fallback về icon mặc định.
 *
 * 3. Tên field lệch hoàn toàn giữa BE và UI:
 *      BE `ingredientName`  -> UI `name`
 *      BE `storageLocation` -> UI `compartment`
 *      BE `expiresAt`       -> UI `expiryDate`
 *    => toàn bộ qua `_toFridgeItem()`, KHÔNG để UI thấy tên field của BE.
 *
 * Quy tắc tuân thủ:
 *   R1 - mapper có test (RealFridgeService.test.js)
 *   R2 - mọi ảnh đi qua appConfig.getImageUrl() (2 host: api. vs file.)
 *   R3 - lỗi mạng / lỗi server để ApiException tự phân loại, service không gộp message
 *   R4 - service này không import service khác, chỉ qua ApiClient
 *   R5 - token chỉ đọc qua TokenStorage (ApiClient lo, không cần ở đây)
 *   R6 - đăng ký bằng side-effect ở cuối file
 *   R7 - comment tiếng Việt
 */

import { ApiClient } from '../../api/ApiClient';
import { registerService } from '../../api/ServiceRegistry';
import { appConfig } from '../../../shared/config/appConfig';

/**
 * Nhãn tiếng Việt cho `storageLocation` của BE.
 * Nguyên tắc mục 0 BƯỚC 3: ưu tiên nội dung mới từ BE, dịch theo cách Flutter
 * hiển thị (Mobile/lib/screens/fridge_inventory_screen.dart:990-993).
 */
const COMPARTMENT_LABEL = {
  fridge: 'Ngăn mát',
  freezer: 'Ngăn đông',
  pantry: 'Tủ khô',
};

// Sắp hết hạn = còn <= 3 ngày. Trùng ngưỡng với `ExpiringQueryDto` (BE mặc định 3)
// và `FridgeStatsResponseDto.expiringSoonCount` (BE ghi rõ "≤3 ngày").
const EXPIRING_SOON_DAYS = 3;

export class RealFridgeService {
  constructor() {
    this.client = ApiClient;
  }

  // ═══════════════ Mapper ═══════════════

  /**
   * Tính status từ `daysUntilExpiry` của BE.
   * Ưu tiên giá trị BE đã trả — không tự tính lại từ `expiresAt` (P0.3 BẮT BUỘC 8).
   * Chỉ fallback sang `expiresAt` khi BE không trả `daysUntilExpiry`.
   */
  _statusFromDays(days) {
    if (days === null || days === undefined) return null;
    if (days < 0) return 'expired';
    if (days <= EXPIRING_SOON_DAYS) return 'expiring';
    return 'fresh';
  }

  /** Tính status từ `expiresAt` - chỉ dùng khi BE không trả `daysUntilExpiry`. */
  _statusFromExpiryDate(expiresAt) {
    if (!expiresAt) return 'fresh';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= EXPIRING_SOON_DAYS) return 'expiring';
    return 'fresh';
  }

  /**
   * BE `FridgeItemResponseDto` -> UI `FridgeItem` (IFridgeService.js).
   *
   * @param {object} dto - response của GET /fridge | POST/PATCH /fridge/items
   * @returns {object} item đúng shape UI
   */
  _toFridgeItem(dto) {
    if (!dto) return null;

    // R2: ảnh phải qua getImageUrl. `ingredientImagePath` là đường dẫn tương đối
    // ('/public/ingredients/ca_chua.jpg') — dùng nguyên sẽ không host được.
    const image = appConfig.getImageUrl(dto.ingredientImagePath);

    // Ưu tiên status BE đã tính; fallback tự tính khi BE không trả daysUntilExpiry.
    const status =
      this._statusFromDays(dto.daysUntilExpiry) ?? this._statusFromExpiryDate(dto.expiresAt);

    return {
      id: dto.id,
      name: dto.ingredientName,
      image: image ?? null,
      quantity: dto.quantity,
      unit: dto.unit,
      compartment: dto.storageLocation,
      compartmentLabel: COMPARTMENT_LABEL[dto.storageLocation] ?? dto.storageLocation,
      status,
      expiryDate: dto.expiresAt ?? null,
      daysUntilExpiry: dto.daysUntilExpiry ?? null,
      ingredientId: dto.ingredientId ?? null,
      purchasedAt: dto.purchasedAt ?? null,
      consumedAt: dto.consumedAt ?? null,
      addedBy: dto.addedBy ?? null,
    };
  }

  /** BE `FridgeStatsResponseDto` -> shape UI của `useFridgeSummary()`. */
  _toSummary(stats, items) {
    // BE KHÔNG có endpoint trả { expiredCount, availableCount }.
    // Suy ra từ `expiringSoonCount` + `totalItems`:
    //   available = tổng - sắp hết hạn  (chưa tính phần đã quá hạn)
    //   expired   = không có con số riêng -> dùng client-side khi có list items
    const total = stats?.totalItems ?? items?.length ?? 0;
    const expiring = stats?.expiringSoonCount ?? 0;

    // Nếu có list items thì đếm chính xác (BE không trả số đã quá hạn).
    let expiredCount = 0;
    let availableCount = Math.max(0, total - expiring);
    if (Array.isArray(items) && items.length > 0) {
      expiredCount = items.filter((i) => i.status === 'expired').length;
      availableCount = items.filter((i) => i.status !== 'expired').length;
    }

    return { expiredCount, availableCount };
  }

  // ═══════════════ Lọc / sắp xếp client-side ═══════════════

  /** `search` — BE không có endpoint này, lọc trong list đã load. */
  _applySearch(items, search) {
    const q = (search || '').toLowerCase().trim();
    if (!q) return items;
    return items.filter((i) => (i.name || '').toLowerCase().includes(q));
  }

  /** `status` — chỉ `expired` là client-side; `expiring` đã xử lý server-side. */
  _applyStatus(items, status) {
    if (!status || status === 'all') return items;
    return items.filter((i) => i.status === status);
  }

  /** `sortBy`/`sortDir` — BE hardcode `expiresAt asc, createdAt desc`, không có sort param. */
  _applySort(items, sortBy, sortDir) {
    if (!sortBy) return items;
    const dir = sortDir === 'desc' ? -1 : 1;
    const sorted = [...items];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'expiry':
          return (new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)) * dir;
        case 'name':
          return (a.name || '').localeCompare(b.name || '') * dir;
        case 'quantity':
          return (a.quantity - b.quantity) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }

  /**
   * Dựng query string cho GET /fridge.
   * CHỈ gửi param BE thật sự nhận — gửi thừa khiến DTO validation fail (400).
   */
  _buildListQuery(filters) {
    const params = {};
    // `compartment` của UI là `storageLocation` của BE (fridge|freezer|pantry)
    if (filters.compartment) params.storageLocation = filters.compartment;
    // `expiringSoon` là filter server-side duy nhất có sẵn
    if (filters.status === 'expiring') params.expiringSoon = true;
    return params;
  }

  // ═══════════════ Interface IFridgeService ═══════════════

  /**
   * Lấy danh sách nguyên liệu.
   *
   * Chia 2 phần rõ ràng (Mục 5.1):
   *   SERVER-SIDE: `compartment` -> storageLocation, `status=expiring` -> expiringSoon=true
   *   CLIENT-SIDE: search, sort, status=expired
   *
   * @param {object} [filters]
   * @returns {Promise<object[]>}
   */
  async getItems(filters = {}) {
    const params = this._buildListQuery(filters);
    const data = await this.client.get('/fridge', { params });
    const list = Array.isArray(data) ? data : [];

    const mapped = list.map((dto) => this._toFridgeItem(dto)).filter(Boolean);

    let result = mapped;
    result = this._applySearch(result, filters.search);
    result = this._applyStatus(result, filters.status);
    result = this._applySort(result, filters.sortBy, filters.sortDir);
    return result;
  }

  /**
   * Lấy 1 item theo id.
   * BE không có GET /fridge/items/:id — lọc trong danh sách đã có.
   * @param {string} id
   */
  async getItemById(id) {
    const items = await this.getItems();
    return items.find((i) => i.id === id) || null;
  }

  /**
   * Summary cho `FridgeSummaryCards` (2 card: đã hết hạn / còn dùng được).
   *
   * BE `GET /fridge/stats` trả { totalSpentThisMonth, wastePercent, mealsCooked,
   * expiringSoonCount, totalItems } — KHÔNG có expiredCount/availableCount.
   * => Gọi song song `/fridge/stats` + `/fridge` để có cả 2 phía trong 1 lần round-trip mỗi cái.
   *
   * @returns {Promise<{expiredCount: number, availableCount: number}>}
   */
  async getSummary() {
    const [stats, list] = await Promise.all([
      this.client.get('/fridge/stats').catch(() => null),
      this.client.get('/fridge').catch(() => null),
    ]);
    const items = Array.isArray(list) ? list.map((dto) => this._toFridgeItem(dto)) : null;
    return this._toSummary(stats, items);
  }

  /**
   * Thêm nguyên liệu.
   *
   * Lưu ý BE: `quantity` + `unit` là BẮT BUỘC; `ingredientId` và `name` đều optional
   * nhưng `fridge.service.ts:141` sẽ throw BadRequest nếu không resolve được nguyên liệu
   * trong danh mục. UI nhập tên tự do -> cần ingredient picker (đã ghi trong phạm vi B1).
   *
   * `expiresAt` CHỈ gửi khi UI có nhập. Không gửi -> BE tự tính theo `storageLocation`
   * (bảng 5 tầng fallback, commit ca5501c). Đây là hành vi ĐÚNG, không phải thiếu sót.
   *
   * @param {object} item - FridgeItemInput của UI
   */
  async addItem(item) {
    const payload = {
      quantity: Number(item.quantity),
      unit: item.unit,
      // Ưu tiên ingredientId (chính xác tuyệt đối), fallback name để BE tự khớp danh mục
      ...(item.ingredientId ? { ingredientId: Number(item.ingredientId) } : {}),
      ...(item.name ? { name: item.name } : {}),
      // UI `compartment` -> BE `storageLocation`
      ...(item.compartment ? { storageLocation: item.compartment } : {}),
      ...(item.expiryDate ? { expiresAt: item.expiryDate } : {}),
      ...(item.purchasedAt ? { purchasedAt: item.purchasedAt } : {}),
    };

    const dto = await this.client.post('/fridge/items', payload);
    return this._toFridgeItem(dto);
  }

  /**
   * Cập nhật item. `UpdateFridgeItemDto` chỉ nhận quantity/unit/expiresAt/storageLocation.
   * UI gửi thêm field khác (name, status...) sẽ bị BE bỏ qua — lọc bên dưới.
   *
   * @param {string} id
   * @param {object} updates
   */
  async updateItem(id, updates = {}) {
    const payload = {};
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity);
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.expiryDate) payload.expiresAt = updates.expiryDate;
    if (updates.compartment) payload.storageLocation = updates.compartment;

    const dto = await this.client.patch(`/fridge/items/${id}`, payload);
    return this._toFridgeItem(dto);
  }

  /** Xoá item (BE soft delete, trả 204). */
  async deleteItem(id) {
    await this.client.delete(`/fridge/items/${id}`);
  }

  /** Đánh dấu đã dùng hết. BE trả lại item đã consume. */
  async markConsumed(id) {
    const dto = await this.client.patch(`/fridge/items/${id}/consume`);
    return this._toFridgeItem(dto);
  }

  // ═══════════════ Bổ sung cho B4 (plan mục 5 + 10b) ═══════════════

  /**
   * `GET /fridge/stats` nguyên bản — dùng cho `WeeklyStatisticsSection` ở B4.
   * BE trả: { totalSpentThisMonth, wastePercent, mealsCooked, expiringSoonCount, totalItems }
   * KHÔNG map sang shape WeeklyStats ở đây: typedef đó thuộc IRecipeService (B3 sẽ sửa).
   *
   * ⚠️ SafeService chỉ bọc method có trong prototype của MockFridgeService.
   * Method này không có trong mock nên không đi qua proxy — gọi trực tiếp từ
   * service khác, hoặc bổ sung vào mock trước khi dùng qua `useServices()`.
   */
  async getFridgeStats() {
    return this.client.get('/fridge/stats');
  }

  /** `GET /fridge/expiring?days=N` — nguyên bản, dùng cho màn "sắp hết hạn". */
  async getExpiring(days = EXPIRING_SOON_DAYS) {
    const data = await this.client.get('/fridge/expiring', { params: { days } });
    const list = Array.isArray(data) ? data : [];
    return list.map((dto) => this._toFridgeItem(dto)).filter(Boolean);
  }

  // ═══════════════ Danh mục nguyên liệu (ingredient picker) ═══════════════

  /**
   * Tìm nguyên liệu trong danh mục — dùng cho picker ở `ManualAddIngredientScreen`.
   *
   * BẮT BUỘC: `AddFridgeItemDto` có cả `ingredientId` lẫn `name` đều optional,
   * nhưng `fridge.service.ts:141` throw BadRequest nếu không resolve được nguyên
   * liệu trong danh mục. UI nhập tên tự do -> lỗi 400. Nên picker BẮT BUỘC
   * chọn được 1 mục trong danh mục rồi gửi `ingredientId`.
   *
   * BE `GET /ingredients` trả PAGINATED: { data, total, page, limit, totalPages }.
   * Nhưng `ApiClient` đã unwrap envelope `{ success, data }` -> còn lại 1 lớp
   * `data` của chính pagination. Vì vậy phải đọc `payload.data`, không phải
   * coi response là mảng.
   *
   * @param {string} query - từ khoá tìm kiếm (rỗng -> lấy danh sách đầu)
   * @param {number} [limit=20] - BE tối đa 100
   * @returns {Promise<Array<{id:number,name:string,defaultUnit:string,image:string|null}>>}
   */
  async searchIngredients(query = '', limit = 20) {
    const params = { limit };
    const q = (query || '').trim();
    if (q) params.search = q;

    const payload = await this.client.get('/ingredients', { params });

    // BE trả { data, total, page, limit, totalPages }. ApiClient đã bỏ envelope
    // ngoài cùng -> đây chính là object pagination.
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return list.map((dto) => ({
      id: dto.id,
      name: dto.name,
      defaultUnit: dto.defaultUnit ?? null,
      // R2: ảnh phải qua getImageUrl — `imagePath` là đường dẫn tương đối.
      image: appConfig.getImageUrl(dto.imagePath) ?? null,
      categoryName: dto.categoryName ?? '',
    }));
  }

  // ═══════════════ Biểu đồ thống kê ═══════════════

  /**
   * `GET /fridge/stats/chart?period=week|month` — dữ liệu biểu đồ chi tiêu + lãng phí.
   *
   * BE trả: { period, labels: string[], spending: number[], wasteItems: number[] }
   * (fridge-response.dto.ts:57-62). Giữ nguyên shape — màn biểu đồ ở B4 sẽ dùng,
   * không map sang shape khác để tránh phải dịch 2 lần.
   *
   * @param {'week'|'month'} [period='week']
   */
  async getStatsChart(period = 'week') {
    return this.client.get('/fridge/stats/chart', { params: { period } });
  }
}

// ══════════════════════════════════════════════════════════════════
// R6: side-effect đăng ký — KHÔNG sửa file dùng chung.
// Key phải khớp `defaultServices` trong ServiceProvider.jsx.
// ══════════════════════════════════════════════════════════════════
registerService('fridgeService', new RealFridgeService());

export { COMPARTMENT_LABEL, EXPIRING_SOON_DAYS };
