/**
 * P0.6e - Override mode lúc chạy (toggle mock/real không cần rebuild).
 *
 * RỦI RO LỚN NHẤT của tính năng này KHÔNG phải là toggle không hoạt động,
 * mà là toggle HOẠT ĐỘNG QUÁ TỐT trong production build - tức là người dùng
 * thật bật được mock và tưởng dữ liệu giả là dữ liệu thật.
 * => Phần lớn test dưới đây khóa hành vi "phải chặn ở production".
 */

import { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  overrideMode,
  getModeOverride,
  isMockMode,
  registerService,
  clearRegistry,
  resolveServices,
  ServiceRegistryProvider,
  useServices,
  useServiceRegistry,
} from '../ServiceRegistry';

/** Mini renderHook - dùng lại pattern của ServiceRegistry.test.jsx */
function renderHook(hookFn, { wrapper } = {}) {
  const ref = { current: undefined };
  const Probe = () => {
    ref.current = hookFn();
    return null;
  };
  const Inner = wrapper ? createElement(wrapper, null, createElement(Probe)) : createElement(Probe);

  let tree;
  act(() => {
    tree = TestRenderer.create(Inner);
  });
  return {
    result: ref,
    unmount: () => act(() => tree.unmount()),
    rerender: () => act(() => tree.update(Inner)),
  };
}

const mockServices = () => ({
  authService: { tag: 'mock-auth' },
  fridgeService: { tag: 'mock-fridge' },
});

// __DEV__ là global do babel/jest-expo cung cấp. Ta gán lại được để test cả 2 nhánh.
const setDev = (v) => {
  global.__DEV__ = v;
};

const ORIGINAL_DEV = global.__DEV__;

beforeEach(() => {
  clearRegistry();
  setDev(true);
  // BỌC act(): overrideMode -> emitModeChange -> bắn vào listener của các
  // Provider đã mount ở test trước. Gọi ngoài act() khiến React cảnh báo
  // "not wrapped in act(...)" và Provider render bằng state cũ.
  //
  // clearRegistry() chỉ xóa realServices, KHÔNG xóa modeListeners - nên nếu
  // test nào mount Provider mà quên unmount, listener đó vẫn sống và bị
  // bắn vào ở đây. Đây là hệ quả của việc thiếu cleanup, không phải bug
  // của ServiceRegistry (ngoài React, gọi listener là hợp lệ).
  act(() => {
    overrideMode(null); // reset về theo env
  });
});

afterAll(() => {
  setDev(ORIGINAL_DEV);
});

// ═══════════════════════════════════════════════════════════════════
// BẢO MẬT: production phải chặn overrideMode
// ═══════════════════════════════════════════════════════════════════

describe('P0.6e bảo mật: production KHÔNG cho override', () => {
  it('__DEV__=false -> overrideMode(true) bị từ chối, trả false', () => {
    setDev(false);
    const ok = overrideMode(true);
    expect(ok).toBe(false);
  });

  it('__DEV__=false -> mode KHÔNG đổi (vẫn null = theo env)', () => {
    setDev(false);
    overrideMode(true);
    expect(getModeOverride()).toBeNull();
  });

  it('__DEV__=false -> resolveServices KHÔNG bị ép mock', () => {
    setDev(false);
    registerService('fridgeService', { tag: 'real-fridge' });

    // Env USE_MOCKS mặc định false trong test, nên real phải được dùng.
    // Nếu override lọt, fridgeService sẽ là mock -> tag sai.
    const out = resolveServices(mockServices());
    expect(out.fridgeService.tag).toBe('real-fridge');
  });

  it('__DEV__=false -> cố tắt real (overrideMode(false)) cũng bị từ chối', () => {
    setDev(false);
    expect(overrideMode(false)).toBe(false);
    expect(getModeOverride()).toBeNull();
  });

  it('__DEV__=false -> gọi nhiều lần vẫn không đổi state', () => {
    setDev(false);
    overrideMode(true);
    overrideMode(false);
    overrideMode(null);
    expect(getModeOverride()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEV: toggle hoạt động
// ═══════════════════════════════════════════════════════════════════

describe('P0.6e dev: toggle đổi mode', () => {
  it('__DEV__=true -> overrideMode(true) trả true và set state', () => {
    expect(overrideMode(true)).toBe(true);
    expect(getModeOverride()).toBe(true);
  });

  it('__DEV__=true -> overrideMode(false) tắt mock', () => {
    overrideMode(true);
    expect(overrideMode(false)).toBe(true);
    expect(getModeOverride()).toBe(false);
    expect(isMockMode()).toBe(false);
  });

  it('overrideMode(null) -> trở về theo env', () => {
    overrideMode(true);
    expect(overrideMode(null)).toBe(true);
    expect(getModeOverride()).toBeNull();
  });

  it('set cùng giá trị -> trả true, không phát event thừa', () => {
    overrideMode(true);
    expect(overrideMode(true)).toBe(true);
    expect(getModeOverride()).toBe(true);
  });

  it('giá trị truthy/falsy được ép về boolean', () => {
    overrideMode(1);
    expect(getModeOverride()).toBe(true);
    overrideMode(0);
    expect(getModeOverride()).toBe(false);
  });

  it('overrideMode(undefined) -> coi như null (reset)', () => {
    overrideMode(true);
    overrideMode(undefined);
    expect(getModeOverride()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// resolveServices phản ứng theo mode
// ═══════════════════════════════════════════════════════════════════

describe('P0.6e resolveServices theo mode', () => {
  beforeEach(() => {
    registerService('fridgeService', { tag: 'real-fridge' });
  });

  it('mode mock -> tất cả là mock, kể cả domain có real', () => {
    overrideMode(true);
    const out = resolveServices(mockServices());
    expect(out.fridgeService.tag).toBe('mock-fridge');
  });

  it('mode real -> domain có real dùng real, domain chưa có thì mock', () => {
    overrideMode(false);
    const out = resolveServices(mockServices());
    expect(out.fridgeService.tag).toBe('real-fridge');
    expect(out.authService.tag).toBe('mock-auth');
  });

  it('toggle mock -> real -> mock trả về đúng từng bước (không bị cache)', () => {
    overrideMode(true);
    expect(resolveServices(mockServices()).fridgeService.tag).toBe('mock-fridge');

    overrideMode(false);
    expect(resolveServices(mockServices()).fridgeService.tag).toBe('real-fridge');

    overrideMode(true);
    expect(resolveServices(mockServices()).fridgeService.tag).toBe('mock-fridge');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Provider re-render khi toggle (tính năng chính của P0.6e)
// ═══════════════════════════════════════════════════════════════════

describe('P0.6e Provider re-render khi toggle', () => {
  const Wrapper = ({ children }) =>
    createElement(ServiceRegistryProvider, { mockServices: mockServices() }, children);

  it('toggle từ mock sang real -> component thấy service mới', () => {
    registerService('fridgeService', { tag: 'real-fridge' });

    const { result } = renderHook(() => useServices(), { wrapper: Wrapper });

    // Mặc định theo env (USE_MOCKS=false trong test) -> real được dùng
    expect(result.current.fridgeService.tag).toBe('real-fridge');

    act(() => {
      overrideMode(true);
    });

    // Sau toggle -> mock
    expect(result.current.fridgeService.tag).toBe('mock-fridge');
  });

  it('toggle real -> mock -> real: component đi theo từng bước', () => {
    registerService('fridgeService', { tag: 'real-fridge' });

    const { result } = renderHook(() => useServices(), { wrapper: Wrapper });
    expect(result.current.fridgeService.tag).toBe('real-fridge');

    act(() => overrideMode(true));
    expect(result.current.fridgeService.tag).toBe('mock-fridge');

    act(() => overrideMode(false));
    expect(result.current.fridgeService.tag).toBe('real-fridge');
  });

  it('useServiceRegistry expose đủ API toggle', () => {
    const { result } = renderHook(() => useServiceRegistry(), { wrapper: Wrapper });

    expect(typeof result.current.has).toBe('function');
    expect(typeof result.current.list).toBe('function');
    expect(typeof result.current.overrideMode).toBe('function');
    expect(typeof result.current.getMode).toBe('function');
    expect(typeof result.current.getModeOverride).toBe('function');
  });

  it('registry.overrideMode qua context cũng đổi được services (giống gọi trực tiếp)', () => {
    registerService('fridgeService', { tag: 'real-fridge' });

    const { result } = renderHook(() => useServiceRegistry(), { wrapper: Wrapper });

    act(() => {
      result.current.overrideMode(true);
    });

    expect(result.current.getModeOverride()).toBe(true);
  });

  it('production: registry.overrideMode qua context cũng bị chặn', () => {
    setDev(false);
    registerService('fridgeService', { tag: 'real-fridge' });

    const { result } = renderHook(() => useServiceRegistry(), { wrapper: Wrapper });
    const before = result.current.getModeOverride();

    act(() => {
      result.current.overrideMode(true);
    });

    expect(result.current.getModeOverride()).toBe(before);
    expect(result.current.getModeOverride()).toBeNull();
  });
});
