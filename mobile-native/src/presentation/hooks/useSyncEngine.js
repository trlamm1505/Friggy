/**
 * useSyncEngine - hook kích hoạt đồng bộ tự động.
 *
 * Port từ Flutter `home_screen.dart`:
 *   - `BackgroundSyncService().syncAll()` khi vào Home
 *   - `Connectivity().onConnectivityChanged` -> `forceSync()` khi có mạng
 *
 * VÌ SAO TÁCH THÀNH HOOK:
 *   Nhiều màn (Home, Profile, App root) đều cần biết trạng thái sync.
 *   Hook gom logic subscribe + kích hoạt, tránh lặp code.
 *
 * ⚠️ VÌ SAO SYNC KHÔNG CHẠY TRONG RENDER:
 *   `useEffect` là nơi đúng để gọi side-effect. Không gọi trong render ->
 *   render lặp lại sẽ sync lặp lại.
 *
 * R7: comment tiếng Việt.
 */

import { useCallback, useEffect, useState } from 'react';
import { syncEngine } from '../../data/offline/SyncEngine';
import { onNetworkEvent } from '../../data/offline/NetworkMonitor';

/**
 * Hook trả về trạng thái sync + hàm sync thủ công.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoSyncOnMount=true] - sync khi mount (Home)
 * @param {boolean} [options.syncOnReconnect=true] - sync khi mạng khôi phục
 * @param {boolean} [options.enabled=true] - tắt toàn bộ (vd khi chưa đăng nhập)
 * @returns {{isSyncing:boolean, pendingCount:number, lastResult:object|null, syncNow:Function}}
 */
export const useSyncEngine = (options = {}) => {
  const { autoSyncOnMount = true, syncOnReconnect = true, enabled = true } = options;

  const [state, setState] = useState({
    isSyncing: false,
    pendingCount: 0,
    lastResult: null,
  });

  /**
   * Kích hoạt sync thủ công (kéo pull-to-refresh).
   *
   * @param {object} [opts]
   * @param {boolean} [opts.force=true] - bỏ qua cờ chống chạy trùng
   * @returns {Promise<object>}
   */
  const syncNow = useCallback(
    async (opts = {}) => {
      const { force = true } = opts;
      if (!enabled) return null;
      return syncEngine.syncAll({ force });
    },
    [enabled]
  );

  // ── Subscribe trạng thái sync ──
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((next) => setState(next));
    return unsubscribe;
  }, []);

  // ── Sync khi mount ──
  useEffect(() => {
    if (!enabled || !autoSyncOnMount) return undefined;

    let cancelled = false;
    (async () => {
      try {
        await syncEngine.syncAll({ force: false });
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[useSyncEngine] Sync khi mount lỗi:', e?.message);
        }
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, autoSyncOnMount]);

  // ── Sync khi mạng khôi phục ──
  useEffect(() => {
    if (!enabled || !syncOnReconnect) return undefined;

    const unsubscribe = onNetworkEvent('online', () => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[useSyncEngine] Mạng khôi phục -> đồng bộ');
      }
      syncEngine.syncAll({ force: true }).catch(() => {});
    });

    return unsubscribe;
  }, [enabled, syncOnReconnect]);

  return { ...state, syncNow };
};

export default useSyncEngine;
