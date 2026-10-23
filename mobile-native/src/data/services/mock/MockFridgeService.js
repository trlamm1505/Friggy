/**
 * Mock Fridge Service
 *
 * Wrap mock JSON + cung cấp CRUD in-memory. Sau này sẽ chuyển sang SQLite
 * cache hoặc Real API qua ServiceProvider.
 *
 * ⚠️ B1 — thêm `searchIngredients`, `getExpiring`, `getFridgeStats`:
 * `SafeService.withFallback` CHỈ bọc method có trong prototype của mock service.
 * Method mới chỉ có trong `RealFridgeService` sẽ KHÔNG đi qua proxy -> UI gọi
 * qua `useServices()` sẽ nhận `undefined` và vỡ. Xem DEV_B_ONBOARDING_PROMPT.md
 * mục 5.1 (ghi chú cuối).
 */

import { IFridgeService } from '../../interfaces/IFridgeService';
import inventoryMock from '../../../shared/mocks/inventory.json';
import ingredientsMock from '../../../shared/mocks/ingredients.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory mutable copy
let items = JSON.parse(JSON.stringify(inventoryMock.items));

export class MockFridgeService extends IFridgeService {
  async getItems(filters = {}) {
    await sleep(MOCK_DELAY);
    // Tính lại `status` từ `expiryDate` thay vì dùng giá trị hardcode trong
    // `inventory.json`. File mock ghi `status` tại thời điểm tạo file, nên
    // theo thời gian nó sai -> ví dụ "Cà chua" hết hạn 18/10 nhưng vẫn ghi
    // `expiring` -> UI hiện màu cam "sắp hết hạn" cho món đã quá hạn.
    // `RealFridgeService` luôn map `status` từ `daysUntilExpiry` của BE ->
    // mock phải khớp (quy tắc R1).
    let result = items.map((i) => ({ ...i, status: this._computeStatus(i.expiryDate) }));
    if (filters.compartment) {
      result = result.filter((i) => i.compartment === filters.compartment);
    }
    if (filters.status) {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      if (q) result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (filters.sortBy) {
      const dir = filters.sortDir === 'desc' ? -1 : 1;
      result = [...result].sort((a, b) => {
        switch (filters.sortBy) {
          case 'expiry':
            return (new Date(a.expiryDate) - new Date(b.expiryDate)) * dir;
          case 'name':
            return a.name.localeCompare(b.name) * dir;
          case 'quantity':
            return (a.quantity - b.quantity) * dir;
          default:
            return 0;
        }
      });
    }
    return result;
  }

  async getItemById(id) {
    await sleep(MOCK_DELAY / 2);
    return items.find((i) => i.id === id) || null;
  }

  async getSummary() {
    await sleep(MOCK_DELAY / 2);
    // Đếm THẬT từ `items` — không đọc file tĩnh `fridge-summary.json`.
    //
    // Lý do: file tĩnh ghi `availableCount: 12` trong khi list thật chỉ có 8 item,
    // và 4 item đã hết hạn. Card ở Home hiện "12 món" nhưng bấm vào màn "Nguyên
    // liệu sẵn có" chỉ thấy 4 -> gây hiểu nhầm là bug. `RealFridgeService` đã
    // đếm thật từ list, mock phải khớp (quy tắc R1).
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let availableCount = 0;

    for (const item of items) {
      const days = this._daysUntilExpiry(item.expiryDate);
      // `days === null` = không có hạn dùng -> coi như còn hạn (BE tự tính,
      // mock không có BE nên để món đó ở nhóm "còn hạn").
      if (days !== null && days < 0) {
        expiredCount += 1;
      } else {
        availableCount += 1;
      }
    }

    return { expiredCount, availableCount };
  }

  async addItem(item) {
    await sleep(MOCK_DELAY);
    // Nếu user KHÔNG chọn ngày hết hạn -> `expiryDate` undefined.
    // BE thật sẽ tự tính `expiresAt` theo `storageLocation`; mock không có BE
    // nên phải tự giả lập, nếu không thì `expiryDate` = undefined ->
    // `getDaysToExpiry(undefined)` = NaN -> item biến mất khỏi mọi màn lọc
    // theo hạn dùng (NaN >= 0 là false).
    const expiryDate = item.expiryDate || this._defaultExpiryDate(item.compartment);

    const newItem = {
      id: `item-${Date.now()}`,
      ...item,
      expiryDate,
      status: this._computeStatus(expiryDate),
    };
    items.push(newItem);
    return newItem;
  }

  async updateItem(id, updates) {
    await sleep(MOCK_DELAY);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Item không tồn tại');
    items[idx] = { ...items[idx], ...updates };
    if (updates.expiryDate) {
      items[idx].status = this._computeStatus(updates.expiryDate);
    }
    return items[idx];
  }

  async deleteItem(id) {
    await sleep(MOCK_DELAY);
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Item không tồn tại');
    items.splice(idx, 1);
  }

  async markConsumed(id) {
    await sleep(MOCK_DELAY);
    return this.deleteItem(id);
  }

  // ─── B1: method mới, phải có trong prototype để SafeService bọc được ───

  /**
   * Tìm nguyên liệu trong danh mục — mock cho `GET /ingredients`.
   * Shape phải khớp `RealFridgeService.searchIngredients()`.
   *
   * @param {string} query
   * @param {number} [_limit] - không dùng (mock trả về tất cả)
   */
  async searchIngredients(query = '') {
    await sleep(MOCK_DELAY / 2);
    const q = (query || '').trim().toLowerCase();
    const list = q
      ? ingredientsMock.filter((i) => i.name.toLowerCase().includes(q))
      : ingredientsMock;
    return list.map((i) => ({
      id: i.id,
      name: i.name,
      defaultUnit: i.defaultUnit ?? null,
      image: i.image ?? null,
      categoryName: i.categoryName ?? '',
    }));
  }

  /** `GET /fridge/expiring?days=N` — mock: lọc client-side theo status. */
  async getExpiring(days = 3) {
    await sleep(MOCK_DELAY / 2);
    return items.filter((i) => i.status === 'expiring').slice(0, Math.max(0, days));
  }

  /**
   * `GET /fridge/stats` — mock: shape giống `FridgeStatsResponseDto` của BE.
   * Xem RealFridgeService.getFridgeStats() để biết field nào được dùng.
   */
  async getFridgeStats() {
    await sleep(MOCK_DELAY / 2);
    const totalItems = items.length;
    const expiringSoonCount = items.filter((i) => i.status === 'expiring').length;
    return {
      totalSpentThisMonth: 0,
      wastePercent: 0,
      mealsCooked: 0,
      expiringSoonCount,
      totalItems,
    };
  }

  /**
   * `GET /fridge/stats/chart?period=week|month` — mock.
   * Shape giống `FridgeStatsChartResponseDto`: { period, labels, spending, wasteItems }.
   */
  async getStatsChart(period = 'week') {
    await sleep(MOCK_DELAY / 2);
    const labels =
      period === 'month'
        ? Array.from({ length: 30 }, (_, i) => `${i + 1}`)
        : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return {
      period,
      labels,
      spending: labels.map(() => 0),
      wasteItems: labels.map(() => 0),
    };
  }

  /**
   * Số ngày còn lại tới hạn. Trả `null` nếu không có hạn dùng (invalid date).
   * Tách riêng để `getSummary` và `_computeStatus` cùng dùng 1 quy tắc.
   */
  _daysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  }

  /**
   * Hạn dùng mặc định khi user không chọn ngày — GIÁ LẬP BE.
   *
   * BE thật có bảng 5 tầng fallback theo `storageLocation` (commit ca5501c).
   * Mock dùng bảng rút gọn: ngăn đông lâu hơn ngăn mát, tủ khô lâu hơn cả hai.
   */
  _defaultExpiryDate(compartment) {
    const daysByCompartment = {
      fridge: 7,
      freezer: 90,
      pantry: 30,
    };
    const days = daysByCompartment[compartment] ?? 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  _computeStatus(expiryDate) {
    const diffDays = this._daysUntilExpiry(expiryDate);
    // Không có hạn dùng -> coi như còn tươi (không phải expired).
    if (diffDays === null) return 'fresh';
    if (diffDays < 0) return 'expired';
    if (diffDays <= 3) return 'expiring';
    return 'fresh';
  }
}
