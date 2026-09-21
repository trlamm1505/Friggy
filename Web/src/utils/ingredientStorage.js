/**
 * Utility to persist and retrieve custom FE ingredient metadata (imagePath, purchase links)
 * stored under localStorage key 'friggy_ingredient_extras'
 */
const STORAGE_KEY = 'friggy_ingredient_extras';

export const getIngredientExtras = (id = null) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return id ? data[id] || null : data;
  } catch (e) {
    return id ? null : {};
  }
};

export const saveIngredientExtra = (id, extraData) => {
  if (!id) return;
  try {
    const data = getIngredientExtras() || {};
    data[id] = {
      ...(data[id] || {}),
      ...extraData,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save ingredient extras:', e);
  }
};
