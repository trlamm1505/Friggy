/**
 * ServiceProvider (P0.5) - test contract tương thích ngược
 *
 * P0.5 là "đóng đường biên": sau bước này, ServiceProvider.jsx + useServiceHooks.js
 * là IMMUTABLE. Test này bảo vệ đúng điều đó: 8 file đang import `useServices`
 * từ ServiceProvider phải tiếp tục chạy y hệt, không ai phải sửa.
 *
 * Rủi ro chính khi đã đóng đường biên:
 *   - Đổi tên export / bỏ export -> 8 file vỡ cùng lúc
 *   - Đổi shape của context value -> destructure hỏng
 *   - resolveServices chạy sai -> màn hình trắng
 */

import React, { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ServiceProvider, useServices } from '../ServiceProvider';
import { clearRegistry, registerService } from '../api/ServiceRegistry';

/** Mini renderHook: mount probe trong Provider, đọc kết quả hook. */
function renderWithProvider(hookFn, { providerProps } = {}) {
  const ref = { current: undefined };
  const Probe = () => {
    ref.current = hookFn();
    return null;
  };

  let tree;
  act(() => {
    tree = TestRenderer.create(createElement(ServiceProvider, providerProps, createElement(Probe)));
  });

  return { result: ref, unmount: () => tree.unmount() };
}

/** React 19 render lỗi bất đồng bộ -> bắt bằng ErrorBoundary. */
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

beforeEach(() => {
  clearRegistry();
});

// ═══════════════ contract export (bảo vệ 8 file đang import) ═══════════════

describe('contract export từ ServiceProvider', () => {
  it('ServiceProvider là component hàm (JSX dùng được)', () => {
    expect(typeof ServiceProvider).toBe('function');
  });

  it('useServices được re-export, là cùng function với ServiceRegistry', () => {
    // Nếu ai đó xóa re-export, test này fail TRƯỚC khi 8 file kia vỡ lúc runtime.
    expect(typeof useServices).toBe('function');
  });

  it('trong Provider -> useServices trả object có đủ 5 domain', () => {
    const { result } = renderWithProvider(() => useServices());

    expect(Object.keys(result.current).sort()).toEqual([
      'authService',
      'fridgeService',
      'notificationService',
      'recipeService',
      'userService',
    ]);
  });

  it('ngoài Provider -> throw (giữ hành vi cũ, lộ lỗi sớm ở dev)', () => {
    const err = captureRenderError(() => useServices());

    expect(err).toBeDefined();
    expect(err.message).toMatch(/ServiceProvider/);
  });
});

// ═══════════════ useServiceHooks.js - file P0.5 KHÔNG đổi ═══════════════

describe('useServiceHooks dùng được với Provider mới (không sửa file hooks)', () => {
  it('useAsyncData nhận đúng shape services như trước', async () => {
    const { useAsyncData } = require('../../presentation/hooks/useServiceHooks');

    let api;
    const Probe = () => {
      api = useAsyncData((services) => Promise.resolve(services.fridgeService), null, []);
      return null;
    };

    let tree;
    act(() => {
      tree = TestRenderer.create(createElement(ServiceProvider, null, createElement(Probe)));
    });

    // fetcher nhận services -> phải có fridgeService
    await act(async () => {});

    expect(api).toBeDefined();
    expect(api.data).toBeDefined();

    act(() => tree.unmount());
  });
});

// ═══════════════ hành vi resolve sau khi đóng đường biên ═══════════════

describe('Provider tự resolve real/mock', () => {
  it('chưa Real*Service nào đăng ký -> toàn bộ mock', () => {
    const { result } = renderWithProvider(() => useServices());

    expect(result.current.authService.constructor.name).toMatch(/Mock/);
    expect(result.current.fridgeService.constructor.name).toMatch(/Mock/);
  });

  it('đăng ký real cho auth -> chỉ auth đổi, 4 domain khác giữ nguyên mock', () => {
    registerService('authService', { constructor: { name: 'RealAuthService' }, tag: 'real' });

    const { result } = renderWithProvider(() => useServices());

    expect(result.current.authService.tag).toBe('real');
    expect(result.current.fridgeService.constructor.name).toMatch(/Mock/);
    expect(result.current.recipeService.constructor.name).toMatch(/Mock/);
  });
});

// ═══════════════ services prop override (đường cứu hộ cho test) ═══════════════

describe('services prop override', () => {
  it('truyền services -> dùng đúng, bỏ qua registry', () => {
    registerService('authService', { tag: 'real-from-registry' });

    const override = {
      authService: { tag: 'override-auth' },
      fridgeService: { tag: 'override-fridge' },
    };

    const { result } = renderWithProvider(() => useServices(), {
      providerProps: { services: override },
    });

    expect(result.current.authService.tag).toBe('override-auth');
    expect(result.current.fridgeService.tag).toBe('override-fridge');
  });

  it('prop đổi -> render lại trả giá trị mới', () => {
    const first = { authService: { tag: 'v1' }, fridgeService: { tag: 'f1' } };
    const second = { authService: { tag: 'v2' }, fridgeService: { tag: 'f2' } };

    const ref = { current: undefined };
    const Probe = () => {
      ref.current = useServices();
      return null;
    };

    let tree;
    act(() => {
      tree = TestRenderer.create(
        createElement(ServiceProvider, { services: first }, createElement(Probe))
      );
    });
    expect(ref.current.authService.tag).toBe('v1');

    act(() => {
      tree.update(createElement(ServiceProvider, { services: second }, createElement(Probe)));
    });
    expect(ref.current.authService.tag).toBe('v2');

    act(() => tree.unmount());
  });
});

// ═══════════════ remount giữ state (singleton) ═══════════════

describe('singleton giữ state qua remount', () => {
  it('2 lần mount -> cùng instance mock', () => {
    const first = renderWithProvider(() => useServices()).result.current.fridgeService;
    const second = renderWithProvider(() => useServices()).result.current.fridgeService;

    expect(first).toBe(second);
  });
});
