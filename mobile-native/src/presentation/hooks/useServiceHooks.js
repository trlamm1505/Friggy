/**
 * useService Hooks - tiện ích để dùng service trong component
 *
 * Ví dụ:
 *   const { data, loading, error, refetch } = useFridgeItems();
 *   const { updateItem } = useFridgeActions();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useServices } from '../../data/ServiceProvider';

/**
 * Generic hook để fetch data từ service
 * @param {(services: any) => Promise<T>} fetcher - function nhận services, trả Promise<T>
 * @param {T} initialValue
 * @param {any[]} deps
 */
export const useAsyncData = (fetcher, initialValue = null, deps = []) => {
  const services = useServices();
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(services);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e);
        if (__DEV__) {
          console.warn('[useAsyncData] Error:', e);
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { data, loading, error, refetch: load, setData };
};

/**
 * Hook lấy fridge items
 */
export const useFridgeItems = (filters) => {
  return useAsyncData(
    (s) => s.fridgeService.getItems(filters),
    [],
    [JSON.stringify(filters || {})],
  );
};

/**
 * Hook lấy fridge summary
 */
export const useFridgeSummary = () => {
  return useAsyncData((s) => s.fridgeService.getSummary(), { expiredCount: 0, availableCount: 0 });
};

/**
 * Hook lấy recipes
 */
export const useRecipes = () => {
  return useAsyncData((s) => s.recipeService.getRecipes(), []);
};

/**
 * Hook lấy recipes với filter + sort
 * @param {Object} filters - { search, maxCookTime, difficulty, sortBy, sortDir }
 */
export const useRecipesFiltered = (filters) => {
  return useAsyncData(
    (s) => s.recipeService.getRecipesFiltered(filters),
    [],
    [JSON.stringify(filters || {})],
  );
};

/**
 * Hook lấy recipe detail theo id
 * @param {string} id
 */
export const useRecipeById = (id) => {
  return useAsyncData(
    (s) => s.recipeService.getRecipeById(id),
    null,
    [id],
  );
};

/**
 * Hook lấy recipe suggestions
 */
export const useRecipeSuggestions = () => {
  return useAsyncData((s) => s.recipeService.getSuggestions(), []);
};

/**
 * Hook lấy weekly stats
 */
export const useWeeklyStats = () => {
  return useAsyncData(
    (s) => s.recipeService.getWeeklyStats(),
    { week: [], data: [], total: 0, previousWeek: 0 },
  );
};

/**
 * Hook lấy notifications
 */
export const useNotifications = (filters) => {
  return useAsyncData(
    (s) => s.notificationService.getNotifications(filters),
    [],
    [JSON.stringify(filters || {})],
  );
};

/**
 * Hook lấy unread count
 */
export const useUnreadCount = () => {
  return useAsyncData((s) => s.notificationService.getUnreadCount(), 0);
};

/**
 * Hook lấy user profile
 */
export const useUserProfile = () => {
  return useAsyncData(
    (s) => s.userService.getProfile(),
    { id: '', name: '', email: '' },
  );
};

/**
 * Hook lấy current subscription plan
 */
export const useCurrentPlan = () => {
  return useAsyncData(
    (s) => s.userService.getCurrentPlan(),
    { name: 'free', displayName: 'Miễn phí', price: 0, currency: 'VND' },
  );
};
