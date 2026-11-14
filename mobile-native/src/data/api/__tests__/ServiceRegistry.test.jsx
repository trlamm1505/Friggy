/**
 * ServiceRegistry - test cho cơ chế self-registering
 *
 * Theo plan mục 9b.3 + 8 (quyết định ServiceRegistry).
 *
 * Lưu ý môi trường: `@testing-library/react-native` 14 + RN 0.86 không có
 * sẵn `renderHook` và không load được ở Node (parse flow types).
 * Vì thế dùng `react-test-renderer` để mount và đọc output trực tiếp.
 */

import React, { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  registerService,
  unregisterService,
  clearRegistry,
  hasRealService,
  listRegisteredServices,
  resolveServices,
  ServiceRegistryProvider,
  useServices,
  useServiceRegistry,
} from '../ServiceRegistry';

/**
 * Mini renderHook: mount 1 component con bên trong Provider, gọi hook,
 * trả hook result ra cho test đọc.
 */
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
    rerender: () => {
      act(() => {
        tree.update(Inner);
      });
    },
    unmount: () => tree.unmount(),
  };
}

/**
 * React 19 render lỗi bất đồng bộ qua cảnh báo console.error chứ không ném
 * đồng bộ ra ngoài act(). Bắt lỗi bằng ErrorBoundary là cách đúng của React 19.
 */
function captureRenderError(hookFn) {
  let captured = null;

  class Boundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { failed: false };
    }
    static getDerivedStateFromError() {
      return { failed: true };
    }
    componentDidCatch(error) {
      captured = error;
    }
    render() {
      return this.state.failed ? null : this.props.children;
    }
  }

  const Probe = () => {
    hookFn();
    return null;
  };

  const realError = console.error;
  console.error = () => {};
  let tree;
  try {
    act(() => {
      tree = TestRenderer.create(createElement(Boundary, null, createElement(Probe)));
    });
  } finally {
    console.error = realError;
  }

  if (tree) {
    act(() => tree.unmount());
  }
  return captured;
}

const mockMap = () => ({
  authService: { tag: 'mock-auth' },
  fridgeService: { tag: 'mock-fridge' },
  recipeService: { tag: 'mock-recipe' },
  notificationService: { tag: 'mock-notif' },
  userService: { tag: 'mock-user' },
});

const realAuth = { tag: 'real-auth' };
const realFridge = { tag: 'real-fridge' };

beforeEach(() => {
  clearRegistry();
});

// ═══════════════ registerService / hasRealService ═══════════════

describe('registerService / hasRealService', () => {
  it('sau khi register -> has = true, liệt kê đúng key', () => {
    expect(hasRealService('authService')).toBe(false);

    registerService('authService', realAuth);

    expect(hasRealService('authService')).toBe(true);
    expect(listRegisteredServices()).toEqual(['authService']);
  });

  it('nhiều domain đăng ký độc lập nhau', () => {
    registerService('authService', realAuth);
    registerService('fridgeService', realFridge);

    expect(hasRealService('authService')).toBe(true);
    expect(hasRealService('fridgeService')).toBe(true);
    expect(hasRealService('recipeService')).toBe(false);
    expect(listRegisteredServices()).toHaveLength(2);
  });

  it('register cùng key 2 lần -> giữ bản mới nhất (overwrite)', () => {
    registerService('authService', { tag: 'v1' });
    registerService('authService', { tag: 'v2' });

    expect(listRegisteredServices()).toHaveLength(1);
    expect(resolveServices(mockMap()).authService.tag).toBe('v2');
  });

  it('unregister / clear làm sạch registry', () => {
    registerService('authService', realAuth);
    unregisterService('authService');
    expect(hasRealService('authService')).toBe(false);

    registerService('authService', realAuth);
    registerService('fridgeService', realFridge);
    clearRegistry();
    expect(listRegisteredServices()).toEqual([]);
  });

  it('input không hợp lệ -> throw (bắt lỗi sớm ở dev)', () => {
    expect(() => registerService('', realAuth)).toThrow(/string không rỗng/);
    expect(() => registerService(null, realAuth)).toThrow(/string không rỗng/);
    expect(() => registerService('authService', null)).toThrow(/phải là object/);
  });
});

// ═══════════════ resolveServices - contract quan trọng ═══════════════

describe('resolveServices - contract quan trọng', () => {
  it('chưa register gì -> trả mock toàn bộ', () => {
    const out = resolveServices(mockMap());

    expect(out.authService.tag).toBe('mock-auth');
    expect(out.fridgeService.tag).toBe('mock-fridge');
    expect(out.recipeService.tag).toBe('mock-recipe');
    expect(out.notificationService.tag).toBe('mock-notif');
    expect(out.userService.tag).toBe('mock-user');
  });

  it('register 1 domain -> chỉ domain đó chuyển sang real', () => {
    registerService('authService', realAuth);

    const out = resolveServices(mockMap());

    expect(out.authService.tag).toBe('real-auth');
    expect(out.fridgeService.tag).toBe('mock-fridge');
    expect(out.recipeService.tag).toBe('mock-recipe');
  });

  it('chỉ auth + fridge real -> recipe/notif/user vẫn mock', () => {
    registerService('authService', realAuth);
    registerService('fridgeService', realFridge);

    const out = resolveServices(mockMap());

    expect(out.authService.tag).toBe('real-auth');
    expect(out.fridgeService.tag).toBe('real-fridge');
    expect(out.recipeService.tag).toBe('mock-recipe');
    expect(out.notificationService.tag).toBe('mock-notif');
    expect(out.userService.tag).toBe('mock-user');
  });

  it('không truyền mockServices -> trả object rỗng (không crash)', () => {
    const out = resolveServices();
    expect(out).toEqual({});
  });

  it('output là object mới -> sửa không ảnh hưởng mock gốc', () => {
    const mocks = mockMap();
    const out = resolveServices(mocks);
    out.authService = { tag: 'tampered' };

    expect(mocks.authService.tag).toBe('mock-auth');
  });

  // ═══════════════ Sprint A1: domain NHẠY CẢM không fallback mock ═══════════════

  it('service đánh dấu criticalAuth -> KHÔNG bọc withFallback (trả thẳng real)', () => {
    // Auth lỗi mà fallback mock = "đăng nhập thành công" bằng user giả.
    // => Domain critical phải trả thẳng real để lỗi ném lên UI.
    const criticalReal = {
      tag: 'critical-real',
      criticalAuth: true,
      login: () => Promise.reject(new Error('boom')),
    };
    registerService('authService', criticalReal);

    const out = resolveServices(mockMap());

    // Không có wrapper -> method trả về đúng instance gốc
    expect(out.authService).toBe(criticalReal);
    expect(out.authService.tag).toBe('critical-real');
  });

  it('service KHÔNG đánh dấu criticalAuth -> vẫn bọc withFallback như cũ', () => {
    registerService('fridgeService', { tag: 'real-fridge' });

    const out = resolveServices(mockMap());

    // Có wrapper -> không phải instance gốc
    expect(out.fridgeService).not.toBe(realFridge);
    expect(out.fridgeService.tag).toBe('real-fridge');
  });

  it('criticalAuth: lỗi 5xx ném lên UI thay vì trả dữ liệu giả', async () => {
    const criticalReal = {
      tag: 'critical-real',
      criticalAuth: true,
      getItems: jest.fn().mockRejectedValue({ statusCode: 500, message: 'Server lỗi' }),
    };
    registerService('fridgeService', criticalReal);

    const out = resolveServices(mockMap());

    await expect(out.fridgeService.getItems()).rejects.toBeDefined();
  });
});

// ═══════════════ ServiceRegistryProvider + useServices ═══════════════

describe('ServiceRegistryProvider + useServices', () => {
  it('truyền services prop -> useServices trả đúng, bỏ qua resolve', () => {
    registerService('authService', realAuth);

    const override = {
      authService: { tag: 'override-auth' },
      fridgeService: { tag: 'override-fridge' },
      recipeService: { tag: 'override-recipe' },
    };

    const { result } = renderHook(() => useServices(), {
      wrapper: ({ children }) =>
        createElement(ServiceRegistryProvider, { services: override }, children),
    });

    expect(result.current.authService.tag).toBe('override-auth');
    expect(result.current.fridgeService.tag).toBe('override-fridge');
    expect(result.current.recipeService.tag).toBe('override-recipe');
  });

  it('không truyền services prop -> dựa vào resolveServices(mockServices)', () => {
    registerService('authService', realAuth);

    const { result } = renderHook(() => useServices(), {
      wrapper: ({ children }) =>
        createElement(ServiceRegistryProvider, { mockServices: mockMap() }, children),
    });

    expect(result.current.authService.tag).toBe('real-auth');
    expect(result.current.fridgeService.tag).toBe('mock-fridge');
  });

  it('destructure key cụ thể hoạt động như cũ', () => {
    const { result } = renderHook(
      () => {
        const services = useServices();
        return services.fridgeService;
      },
      {
        wrapper: ({ children }) =>
          createElement(ServiceRegistryProvider, { mockServices: mockMap() }, children),
      }
    );

    expect(result.current.tag).toBe('mock-fridge');
  });
});

// ═══════════════ useServiceRegistry - debug hook ═══════════════

describe('useServiceRegistry - debug hook', () => {
  it('trả về has + list để debug', () => {
    registerService('authService', realAuth);

    const { result } = renderHook(() => useServiceRegistry(), {
      wrapper: ({ children }) =>
        createElement(ServiceRegistryProvider, { mockServices: mockMap() }, children),
    });

    expect(result.current.has('authService')).toBe(true);
    expect(result.current.has('fridgeService')).toBe(false);
    expect(result.current.list()).toEqual(['authService']);
  });
});

// ═══════════════ useServices fallback khi không có Provider ═══════════════

describe('useServices fallback khi không có Provider', () => {
  it('ngoài Provider -> throw (giữ hành vi cũ của ServiceProvider)', () => {
    const err = captureRenderError(() => useServices());

    expect(err).toBeDefined();
    expect(err.message).toMatch(/ServiceProvider/);
  });

  it('useServiceRegistry ngoài Provider -> throw', () => {
    const err = captureRenderError(() => useServiceRegistry());

    expect(err).toBeDefined();
    expect(err.message).toMatch(/ServiceProvider/);
  });
});

// ═══════════════ tình huống sprint A1 vừa xong ═══════════════

describe('mục đích của resolve', () => {
  it('A1 vừa xong: chỉ auth real, 4 domain còn lại mock', () => {
    // Auth vừa được nối thật - tất cả UI khác vẫn chạy vì fallback mock
    registerService('authService', realAuth);

    const services = resolveServices(mockMap());

    const tags = Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v.tag]));
    const realCount = Object.values(tags).filter((t) => t === 'real-auth').length;
    const mockCount = Object.values(tags).filter((t) => t.startsWith('mock-')).length;

    expect(realCount).toBe(1);
    expect(mockCount).toBe(4);
  });
});
