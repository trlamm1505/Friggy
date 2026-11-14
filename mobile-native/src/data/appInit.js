/**
 * Khoi tao shell app - logic thuan de test.
 *
 * Tach khoi App.jsx de:
 *   - App.jsx chi con render (khong co logic logic)
 *   - Co the test bang Jest ma khong can react-native preset
 *   - Co the goi tu bat ky dau (tests, CLI seed, scripts)
 *
 * Test focus: USE_MOCKS=true -> seed chay, USE_MOCKS=false -> KHONG seed.
 *           resolveServices luon duoc goi trong ca hai nhanh.
 *
 * Tra ve:
 *   - true  : khoi tao OK, UI co the render
 *   - false : loi xay ra, App.jsx se hien loading man hinh cho toi khi retry
 */

import { appConfig } from '../shared/config/appConfig';
import { resolveServices } from './api/ServiceRegistry';
import { seedAll } from './storage/seedData';

/** Lay action tu appConfig - test override bang jest.setMock kho hon,
 *  nen chung ta chi test qua toggle env that. */
const shouldSeed = () => appConfig.USE_MOCKS === true;

/**
 * @param {Object} hooks - de test inject (khong dung o runtime)
 *   - onSeedStart, onSeedEnd: tap su kien
 *   - onResolveEnd: tap sau khi resolve
 * @returns {Promise<boolean>}
 */
export const initAppShell = async (hooks = {}) => {
  const { onSeedStart, onSeedEnd, onResolveEnd } = hooks;
  try {
    if (shouldSeed()) {
      if (onSeedStart) onSeedStart();
      await seedAll();
      if (onSeedEnd) onSeedEnd();
    }
    resolveServices({});
    if (onResolveEnd) onResolveEnd();
    return true;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[App] Init error:', e);
    }
    return false;
  }
};
