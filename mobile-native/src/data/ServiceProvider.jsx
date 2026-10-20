/**
 * Service Provider
 *
 * React Context để inject services vào cây component. Mặc định dùng
 * Mock implementation. Sau này có thể swap sang Real implementation
 * bằng cách truyền `services` prop vào AppProviders.
 *
 * Cách dùng trong component:
 *   const { fridgeService } = useServices();
 *   const items = await fridgeService.getItems();
 */

import React, { createContext, useContext, useMemo } from 'react';
import { MockAuthService } from './services/mock/MockAuthService';
import { MockFridgeService } from './services/mock/MockFridgeService';
import { MockRecipeService } from './services/mock/MockRecipeService';
import { MockNotificationService } from './services/mock/MockNotificationService';
import { MockUserService } from './services/mock/MockUserService';

// Singleton instances (giữ state qua các remount)
const defaultServices = {
  authService: new MockAuthService(),
  fridgeService: new MockFridgeService(),
  recipeService: new MockRecipeService(),
  notificationService: new MockNotificationService(),
  userService: new MockUserService(),
};

const ServiceContext = createContext(defaultServices);

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} [props.services] - optional override (for testing hoặc swap sang Real)
 */
export const ServiceProvider = ({ children, services }) => {
  const value = useMemo(() => services || defaultServices, [services]);
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

/**
 * Hook lấy services. Có thể destructure cụ thể:
 *   const { fridgeService, recipeService } = useServices();
 */
export const useServices = () => {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServices() phải được dùng bên trong <ServiceProvider>');
  }
  return ctx;
};
