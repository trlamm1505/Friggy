/**
 * ServiceRegistry - Self-Registering Service Registry
 *
 * Port logic từ plan mục 8 (Quyết định đã chốt).
 *
 * Tại sao cần registry:
 *   - Real services (sprint A*, B*) đăng ký qua side-effect ở đầu file: `registerService('xxx', new RealXxx())`
 *   - Mock services được inject bằng prop `services` (test) hoặc hardcode trong ServiceProvider (app thật)
 *   - ServiceProvider.xx gọi `resolveServices()` -> trả real nếu có, fallback mock
 *
 * Hai trường hợp đặc biệt:
 *   - USE_MOCKS=true (env): ép dùng mock toàn bộ (UI design / BE down)
 *   - Real domain chưa đăng ký: tự fallback mock -> app không crash giữa chừng sprint
 *
 * Sau Phase 0: ServiceProvider.jsx và useServiceHooks.js là IMMUTABLE.
 * Mọi sprint chỉ thêm Real*Service và import side-effect -> tự động chuyển domain đó sang thật.
 */

import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { appConfig } from '../../shared/config/appConfig';
import { withFallback } from './SafeService';

const realServices = new Map();

// ═══════════════════════════════════════════════════════════════════
// P0.6e - Override mode (chỉ __DEV__)
// ═══════════════════════════════════════════════════════════════════

/**
 * Mode hiện tại: null = theo appConfig.USE_MOCKS, true = ép mock, false = ép real.
 * Dùng null (thay vì boolean) để phân biệt "user chưa chạm gì" với "user tắt cả 2".
 */
let modeOverride = null;

const modeListeners = new Set();

const emitModeChange = () => {
  modeListeners.forEach((fn) => fn());
};

const subscribeMode = (fn) => {
  modeListeners.add(fn);
  return () => modeListeners.delete(fn);
};

const getModeSnapshot = () => modeOverride;

/**
 * Ép chế độ mock/real lúc chạy (P0.6e) - chỉ có tác dụng trong __DEV__.
 *
 * VÌ SAO PHẢI CHẶN Ở PRODUCTION:
 *   Đây là cửa để bật mock trong app build thật. Nếu lọt xuống production,
 *   người dùng thật có thể bật mock và tưởng dữ liệu giả là dữ liệu thật.
 *   Ngoài ra còn mở đường cho dữ liệu giả lọt vào ảnh chụp/báo cáo bug.
 */
export const overrideMode = (next) => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    // Production: từ chối, KHÔNG đổi state.
    console.warn('[ServiceRegistry] overrideMode bị chặn ở production build');
    return false;
  }

  const normalized = next === null || next === undefined ? null : Boolean(next);
  if (normalized === modeOverride) return true;

  modeOverride = normalized;
  emitModeChange();
  return true;
};

/** Đọc mode đang hiệu lực. true = dùng mock. */
export const getMode = () => (modeOverride === null ? Boolean(appConfig.USE_MOCKS) : modeOverride);

/** true nếu đang ở chế độ mock (env bật VÀ user chưa tắt). Dùng cho seed (P0.6). */
export const isMockMode = () => getMode() === true;

/** Mode override hiện tại (null = chưa override, đang theo env). */
export const getModeOverride = () => modeOverride;

/** Test-only: đặt mode trực tiếp, không qua kiểm tra __DEV__. */
export const __setModeForTest = (next) => {
  modeOverride = next === undefined ? null : next;
  emitModeChange();
};

/**
 * Đăng ký Real*Service. Domain đã đăng ký được ưu tiên dùng, không phụ thuộc USE_MOCKS
 * trừ khi USE_MOCKS=true (env để UI design không bị real trộn vào).
 *
 * @param {string} key - key khớp với ServiceProvider (vd: 'fridgeService')
 * @param {object} impl - instance của Real*Service
 */
export const registerService = (key, impl) => {
  if (!key || typeof key !== 'string') {
    throw new Error('registerService: key phải là string không rỗng');
  }
  if (!impl || typeof impl !== 'object') {
    throw new Error('registerService: impl phải là object');
  }
  realServices.set(key, impl);
};

/** Test/debug: gỡ đăng ký của 1 domain. Không nên dùng trong app code. */
export const unregisterService = (key) => {
  realServices.delete(key);
};

/** Test/debug: xóa sạch registry. KHÔNG dùng trong app code. */
export const clearRegistry = () => {
  realServices.clear();
};

/** Test/debug: đã có real cho key này chưa. */
export const hasRealService = (key) => realServices.has(key);

/** Test/debug: liệt kê các domain đã đăng ký real. */
export const listRegisteredServices = () => Array.from(realServices.keys());

/**
 * Trả về services đã resolve. Đây là hàm ServiceProvider dùng.
 *
 * P0.6b: mỗi real service được bọc bằng withFallback() để:
 *   - lỗi 5xx / network -> trả dữ liệu mock, app không trắng
 *   - lỗi 4xx (401/403/422) -> ném lên, UI form hiển thị cho user
 *   - data rỗng -> trả nguyên (EmptyState lo việc này, xem P0.6c)
 *
 * @param {object} mockServices - map mock (key -> instance) từ ServiceProvider
 * @returns {object} map (key -> instance) đã merge mock + real (real đã wrap fallback)
 */
export const resolveServices = (mockServices = {}) => {
  // Chế độ mock (env USE_MOCKS hoặc user toggle ở P0.6e) -> ép mock toàn bộ.
  // Dùng getMode() thay vì appConfig.USE_MOCKS để toggle lúc chạy có tác dụng.
  if (getMode()) {
    return { ...mockServices };
  }

  // Ưu tiên real nếu đã đăng ký, fallback mock khi domain chưa có real.
  // Nếu có real -> bọc withFallback(mock làm fallback) trừ khi SAFE_FALLBACK tắt.
  const out = {};
  for (const [key, mock] of Object.entries(mockServices)) {
    const real = realServices.get(key);
    if (!real) {
      // Chưa có real cho domain này -> mock thuần, không cần bọc
      out[key] = mock;
      continue;
    }
    out[key] = withFallback(real, mock, {
      label: key.replace(/Service$/, ''),
      enabled: appConfig.SAFE_FALLBACK,
    });
  }
  return out;
};

/**
 * Context provider cho cây component. Trả về { services, registry } để:
 *   - screens: destructure services như cũ qua useServices()
 *   - test hoặc ServiceDebugCard có thể truy cập registry để debug
 */
const ServiceRegistryContext = createContext(null);

export const ServiceRegistryProvider = ({ children, mockServices, services }) => {
  // P0.6e: subscribe vào module-level mode store để toggle lúc chạy làm
  // re-render toàn bộ cây component, đổi services từ mock sang real (hoặc ngược lại)
  // mà không cần rebuild app.
  //
  // Dùng useSyncExternalStore (không phải useState) vì overrideMode được gọi từ
  // module bên ngoài React - useState sẽ không nhận được thay đổi đó.
  const modeOverride = useSyncExternalStore(subscribeMode, getModeSnapshot, getModeSnapshot);

  // Nếu đã truyền `services` prop (test/demo) -> dùng nguyên, KHÔNG resolve
  //   để có thể ép 1 domain cụ thể sang thật/giả bất chấp env.
  // Ngược lại: dựa trên mode hiện tại + registry đã đăng ký.
  const value = useMemo(() => {
    const registryApi = {
      has: hasRealService,
      list: listRegisteredServices,
      overrideMode,
      getMode,
      getModeOverride,
    };

    if (services) {
      return { services, registry: registryApi };
    }
    const resolved = resolveServices(mockServices || {});
    return { services: resolved, registry: registryApi };
    // modeOverride KHÔNG được đọc trong thân hàm - nó ở đây chỉ để phá cache
    // của useMemo, buộc resolve lại từ đầu mỗi khi toggle. Xóa nó là phá
    // tính năng P0.6e (services sẽ kẹt ở mode cũ).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, mockServices, modeOverride]);

  return (
    <ServiceRegistryContext.Provider value={value}>{children}</ServiceRegistryContext.Provider>
  );
};

/**
 * Hook lấy service map. Dùng giống useServices cũ: `const { fridgeService } = useServices()`.
 *
 * Hành vi GIỮ NGUYÊN so với ServiceProvider cũ: dùng ngoài Provider thì throw,
 * để lộ lỗi sớm ở dev thay vì render ra UI rỗng rồi crash ở chỗ kỳ lạ.
 */
export const useServices = () => {
  const ctx = useContext(ServiceRegistryContext);
  if (!ctx) {
    throw new Error('useServices() phải được dùng bên trong <ServiceProvider>');
  }
  return ctx.services;
};

export const useServiceRegistry = () => {
  const ctx = useContext(ServiceRegistryContext);
  if (!ctx) {
    throw new Error('useServiceRegistry() phải được dùng bên trong <ServiceProvider>');
  }
  return ctx.registry;
};
