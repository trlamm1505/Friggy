/**
 * Mock Fridge Service
 *
 * Wrap mock JSON + cung cấp CRUD in-memory. Sau này sẽ chuyển sang SQLite
 * cache hoặc Real API qua ServiceProvider.
 */

import { IFridgeService } from '../../interfaces/IFridgeService';
import inventoryMock from '../../../shared/mocks/inventory.json';
import summaryMock from '../../../shared/mocks/fridge-summary.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory mutable copy
let items = JSON.parse(JSON.stringify(inventoryMock.items));

export class MockFridgeService extends IFridgeService {
  async getItems(filters = {}) {
    await sleep(MOCK_DELAY);
    let result = [...items];
    if (filters.compartment) {
      result = result.filter((i) => i.compartment === filters.compartment);
    }
    if (filters.status) {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.category) {
      result = result.filter((i) => i.category === filters.category);
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
          case 'category':
            return (a.category || '').localeCompare(b.category || '') * dir;
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
    return { ...summaryMock };
  }

  async addItem(item) {
    await sleep(MOCK_DELAY);
    const newItem = {
      id: `item-${Date.now()}`,
      ...item,
      status: this._computeStatus(item.expiryDate),
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

  _computeStatus(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 3) return 'expiring';
    return 'fresh';
  }
}
