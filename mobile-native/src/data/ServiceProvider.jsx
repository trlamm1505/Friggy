/**
 * Service Provider
 *
 * React Context để inject services vào cây component.
 *
 * ⚠️ FILE IMMUTABLE TỪ P0.5 — không sửa nữa.
 *
 * Plan mục 1: 2 file này (ServiceProvider.jsx + useServiceHooks.js) là điểm xung đột
 * duy nhất nếu chia nhánh. Sau P0.5 chúng coi như khóa: mọi sprint chỉ thêm
 * Real*Service + 1 dòng `registerService(...)`, KHÔNG sửa 2 file này.
 *
 * Cơ chế (P0.4 - ServiceRegistry):
 *   1. Mỗi Real*Service tự đăng ký qua side-effect: registerService('xxx', new RealXxx())
 *   2. Provider gọi resolveServices(mockServices) -> real nếu đã đăng ký, ngược lại mock
 *   3. Domain chưa có Real -> tự fallback mock -> app luôn chạy được giữa chừng các sprint
 *
 * Cách dùng trong component (KHÔNG đổi):
 *   const { fridgeService } = useServices();
 *   const items = await fridgeService.getItems();
 */

import React, { useMemo } from 'react';
import { MockAuthService } from './services/mock/MockAuthService';
import { MockFridgeService } from './services/mock/MockFridgeService';
import { MockRecipeService } from './services/mock/MockRecipeService';
import { MockNotificationService } from './services/mock/MockNotificationService';
import { MockUserService } from './services/mock/MockUserService';
import { ServiceRegistryProvider, useServices } from './api/ServiceRegistry';

// Singleton instances (giữ state qua các remount)
const defaultServices = {
  authService: new MockAuthService(),
  fridgeService: new MockFridgeService(),
  recipeService: new MockRecipeService(),
  notificationService: new MockNotificationService(),
  userService: new MockUserService(),
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} [props.services] - optional override (test, hoặc ép 1 domain cụ thể)
 */
export const ServiceProvider = ({ children, services }) => {
  // services prop -> ServiceRegistryProvider dùng nguyên, bỏ qua resolve.
  //   Không có prop -> resolveServices(defaultServices): ưu tiên real đã đăng ký.
  const value = useMemo(() => ({ services, mockServices: defaultServices }), [services]);

  return <ServiceRegistryProvider {...value}>{children}</ServiceRegistryProvider>;
};

/**
 * Hook lấy services. Re-export từ ServiceRegistry (P0.4) - đây là cầu nối
 * để 8 file đang import `useServices` từ đây tiếp tục chạy mà không phải sửa.
 * 8 file đó không nằm trong phạm vi Phase 0, nên giữ nguyên import của họ.
 */
export { useServices };
