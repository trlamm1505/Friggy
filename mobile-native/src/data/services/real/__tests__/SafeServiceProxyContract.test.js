/**
 * TEST CHỐT HỒI QUY — `SafeService` proxy phải expose MỌI method của real service.
 *
 * Sprint A3 (24/10).
 *
 * ⚠️ BỐI CẢNH:
 *   `SafeService.withFallback(real, mock)` chỉ expose method có trong prototype
 *   chain của MOCK (xem `SafeService.js` -> `collectNames(mockService)`).
 *   Method chỉ có ở REAL sẽ **biến mất khỏi `useServices()`** -> UI gọi
 *   `service.method()` -> `undefined is not a function` -> CRASH.
 *
 *   Bug này đã xảy ra thật ở A3: `RealUserService` có nhiều method mà
 *   `MockUserService` không có -> màn "Quản lý gói" + "Quản lý gia đình"
 *   CRASH khi `USE_MOCKS=false`.
 *
 *   Test này quét TẤT CẢ domain ĐĂNG KÝ thật (`registerService(...)`), không
 *   chỉ A3 -> bắt được bug tương lai của B2/B3/B4 (Dev B thêm method mới vào
 *   real mà quên thêm vào mock).
 *
 * ⚠️ VÌ SAO ĐỌC SOURCE THAY VÌ IMPORT:
 *   `Real*Service` gọi `registerService(...)` ở module scope (side-effect) và
 *   import `ApiClient` -> có thể chạm network/token khi require. Ta chỉ đọc
 *   source bằng `fs` để lấy DANH SÁCH TÊN METHOD, không instantiate.
 */

import fs from 'fs';
import path from 'path';

import { MockUserService } from '../../mock/MockUserService';
import { MockFridgeService } from '../../mock/MockFridgeService';
import { MockAuthService } from '../../mock/MockAuthService';

import { IUserService } from '../../../interfaces/IUserService';
import { IFridgeService } from '../../../interfaces/IFridgeService';
import { IAuthService } from '../../../interfaces/IAuthService';

/**
 * Thư mục chứa file `Real*Service`.
 *
 * Dùng `require.resolve` (KHÔNG dùng `__dirname` vì eslint config của app
 * chưa khai báo node globals cho file test) và chỉ lấy đường dẫn — KHÔNG
 * `require` file, nên side-effect `registerService(...)` không chạy.
 */
const REAL_DIR = path.dirname(require.resolve('../RealUserService.js'));

/** Thu tập tên method trên toàn bộ prototype chain (giống `collectNames`). */
const collectMethodNames = (obj) => {
  const names = new Set();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name === 'constructor') continue;
      if (typeof obj[name] === 'function') names.add(name);
    }
    current = Object.getPrototypeOf(current);
  }
  return names;
};

/**
 * Đọc class `Real*Service` từ file mà KHÔNG cần import (tránh side-effect).
 * Chỉ lấy method PUBLIC (bỏ `_` prefix) — method private không ai gọi từ UI.
 */
const RESERVED_WORDS = new Set([
  'constructor',
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'return',
  'function',
  'class',
  'do',
  'else',
  'try',
]);

const readRealMethodNames = (fileName) => {
  const filePath = path.join(REAL_DIR, fileName);
  const src = fs.readFileSync(filePath, 'utf8');
  const names = new Set();
  const re = /^\s{2}(?:async\s+)?(\w+)\s*\(/gm;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    if (name.startsWith('_')) continue;
    if (RESERVED_WORDS.has(name)) continue;
    names.add(name);
  }
  return names;
};

/**
 * Danh sách domain ĐĂNG KÝ THẬT (khớp `registerService(...)` trong
 * `src/data/services/real/*.js`). Đây là nguồn sự thật của `useServices()`.
 */
const DOMAINS = [
  {
    label: 'userService',
    realFile: 'RealUserService.js',
    mock: new MockUserService(),
    iface: IUserService,
  },
  {
    label: 'fridgeService',
    realFile: 'RealFridgeService.js',
    mock: new MockFridgeService(),
    iface: IFridgeService,
  },
  {
    label: 'authService',
    realFile: 'RealAuthService.js',
    mock: new MockAuthService(),
    iface: IAuthService,
  },
];

describe('SafeService proxy - moi method cua real deu phai co o mock hoac interface', () => {
  it.each(DOMAINS)('$label: khong co method nao cua real bi mat khi proxy', (domain) => {
    const realMethods = readRealMethodNames(domain.realFile);
    const mockMethods = collectMethodNames(domain.mock);
    const ifaceMethods = collectMethodNames(domain.iface);

    const missing = [...realMethods].filter(
      (m) => !mockMethods.has(m) && !ifaceMethods.has(m)
    );

    expect({
      domain: domain.label,
      missing,
    }).toEqual({ domain: domain.label, missing: [] });
  });

  it('mọi domain đều tồn tại file real service tương ứng', () => {
    for (const domain of DOMAINS) {
      const filePath = path.join(REAL_DIR, domain.realFile);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('mỗi domain đều đăng ký đúng 1 key trong ServiceRegistry', () => {
    for (const domain of DOMAINS) {
      const filePath = path.join(REAL_DIR, domain.realFile);
      const src = fs.readFileSync(filePath, 'utf8');
      expect(src).toContain(`registerService('${domain.label}'`);
    }
  });
});
