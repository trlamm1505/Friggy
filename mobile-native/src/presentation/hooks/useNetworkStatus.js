/**
 * useNetworkStatus - theo dõi trạng thái online/offline.
 *
 * Dùng cho `OfflineBanner` (hiện/ẩn theo trạng thái mạng).
 *
 * VÌ SAO DÙNG `useSyncExternalStore`:
 *   `networkMonitor` là module-level singleton -> thay đổi trạng thái từ bên
 *   ngoài React (listener của expo-network). `useSyncExternalStore` là cách
 *   đúng để React subscribe vào store ngoài mà không cần Context.
 *
 * R7: comment tiếng Việt.
 */

import { useEffect, useState } from 'react';
import { networkMonitor, onNetworkEvent } from '../../data/offline/NetworkMonitor';

/**
 * Hook trả về trạng thái mạng.
 *
 * @returns {{isOnline:boolean, isOffline:boolean}}
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline);

  useEffect(() => {
    // Đọc lại 1 lần khi mount (có thể đã thay đổi từ lúc module load).
    networkMonitor.checkConnection().then(setIsOnline);

    const unsubscribeOnline = onNetworkEvent('online', () => setIsOnline(true));
    const unsubscribeOffline = onNetworkEvent('offline', () => setIsOnline(false));

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
};

export default useNetworkStatus;
