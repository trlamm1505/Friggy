/**
 * Mock Recipe Service
 */

import { IRecipeService } from '../../interfaces/IRecipeService';
import recipesMock from '../../../shared/mocks/recipes.json';
import suggestionsMock from '../../../shared/mocks/cooking-suggestions.json';
import weeklyStatsMock from '../../../shared/mocks/weekly-stats.json';
import shoppingMock from '../../../shared/mocks/shopping-reminder.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let shoppingList = JSON.parse(JSON.stringify(shoppingMock.items));

// Mock weekly plan
const mockNextWeekPlan = {
  id: 'plan-current',
  weekStart: '2026-10-19',
  slots: {
    breakfast: { id: 'r1', name: 'Trứng xào cà chua', image: 'recipe_tomato_egg', cookTime: 15 },
    lunch: { id: 'r2', name: 'Canh rau củ', image: 'recipe_veggie_soup', cookTime: 25 },
    dinner: { id: 'r3', name: 'Thịt heo kho trứng', image: null, cookTime: 45 },
  },
};

export class MockRecipeService extends IRecipeService {
  async getRecipes() {
    await sleep(MOCK_DELAY);
    return [...recipesMock.recipes];
  }

  async getRecipeById(id) {
    await sleep(MOCK_DELAY / 2);
    return recipesMock.recipes.find((r) => r.id === id) || null;
  }

  async getSuggestions() {
    await sleep(MOCK_DELAY);
    return [...suggestionsMock.suggestions];
  }

  async getRecipesFiltered(filters = {}) {
    await sleep(MOCK_DELAY);
    let result = [...recipesMock.recipes];
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      if (q) {
        result = result.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.ingredients || []).some((ing) => ing.toLowerCase().includes(q)),
        );
      }
    }
    if (filters.maxCookTime) {
      result = result.filter((r) => r.cookTime <= filters.maxCookTime);
    }
    if (filters.difficulty) {
      const diffs = Array.isArray(filters.difficulty) ? filters.difficulty : [filters.difficulty];
      result = result.filter((r) => diffs.includes(r.difficulty));
    }
    if (filters.sortBy) {
      const dir = filters.sortDir === 'desc' ? -1 : 1;
      result = [...result].sort((a, b) => {
        switch (filters.sortBy) {
          case 'cookTime':
            return (a.cookTime - b.cookTime) * dir;
          case 'name':
            return a.name.localeCompare(b.name) * dir;
          case 'difficulty': {
            const order = { easy: 0, medium: 1, hard: 2 };
            return ((order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)) * dir;
          }
          default:
            return 0;
        }
      });
    }
    return result;
  }

  async getWeeklyStats() {
    await sleep(MOCK_DELAY / 2);
    return { ...weeklyStatsMock };
  }

  async getNextWeekPlan() {
    await sleep(MOCK_DELAY);
    return { ...mockNextWeekPlan };
  }

  async markSlotCooked(planId, slot) {
    await sleep(MOCK_DELAY);
    // mock - no-op, chỉ return thành công
  }

  async getShoppingList() {
    await sleep(MOCK_DELAY / 2);
    return [...shoppingList];
  }

  async toggleShoppingItem(id) {
    await sleep(MOCK_DELAY);
    const idx = shoppingList.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Item không tồn tại');
    shoppingList[idx] = { ...shoppingList[idx], done: !shoppingList[idx].done };
    return shoppingList[idx];
  }
}
