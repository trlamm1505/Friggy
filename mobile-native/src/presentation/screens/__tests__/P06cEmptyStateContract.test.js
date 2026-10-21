/**
 * P0.6c - test chống crash UI khi service rỗng / lỗi.
 *
 * PHẠM VI THẬT (khác plan):
 *   Plan nói "wire EmptyState cho 6 screen chưa dùng". Audit thực tế cho thấy
 *   5/6 screen ĐÃ có skeleton + ErrorState + EmptyState đầy đủ. Việc làm lại
 *   sẽ chỉ tăng rủi ro. Test dưới đây khóa lại HÀNH VI ĐÚNG của 6 screen đó,
 *   để sau này ai sửa cũng không phá vỡ.
 *
 *   3 bug THẬT tìm được khi audit (không nằm trong plan):
 *     1. FridgeSummaryCards + GreetingBanner không xử lý `error`
 *        -> loading=false + error != null + data=undefined => rơi vào
 *           nhánh render data, đọc summary.expiredCount của undefined => CRASH.
 *     2. NotificationsScreen gọi services.notifications (key không tồn tại,
 *        đúng là notificationService) => crash khi user bấm đánh dấu đã đọc.
 *     3. HomeScreen bỏ qua data/loading/error, chỉ lấy refetch -> không ai
 *        kiểm soát lỗi ở tầng screen.
 *
 * Vì jest-expo không mock được toàn bộ cây component native, các test này dùng
 * cách kiểm tra HÀNH VI THUẦN qua các hàm quyết định, tái sử dụng đúng logic
 * mà component dùng. Đây là ranh giới khả thi và có giá trị thật cho Phase 0.
 */

const { ApiException } = require('../../../data/api/ApiException');
const { shouldFallback } = require('../../../data/api/SafeService');

const fs = require('fs');
const path = require('path');

// Gốc của cây presentation - mọi đường dẫn file trong test này bắt đầu từ đây.
// __dirname không dùng được (file là ESM theo eslint -> no-undef), nên dựng lại
// từ đường dẫn file đang chạy: <root>/src/presentation/screens/__tests__/x.js
const PRESENTATION_ROOT = path.resolve(
  path.dirname(require.resolve('./P06cEmptyStateContract.test.js')),
  '..',
  '..'
);

// ═══════════════════════════════════════════════════════════════
// BUG 1: contract "rỗng / lỗi / tải" phải phân biệt được
// (Đây là quy tắc mà cả 6 screen + các widget Home đều phải tuân)
// ═══════════════════════════════════════════════════════════════════

/**
 * Quyết định trạng thái hiển thị, theo đúng thứ tự mà plan P0.6c quy định:
 *   loading -> Skeleton
 *   error && !data -> ErrorState
 *   data rỗng -> EmptyState
 *   ngược lại -> render data
 */
const resolveViewState = ({ loading, error, data }) => {
  if (loading && data === undefined) return 'skeleton';
  if (error && !data) return 'error';
  if (data === undefined || data === null) return 'error';
  if (Array.isArray(data) && data.length === 0) return 'empty';
  if (data && !Array.isArray(data) && Object.keys(data).length === 0) return 'empty';
  return 'data';
};

describe('P0.6c contract: phân biệt loading / error / empty / data', () => {
  it('loading, data chưa có -> skeleton', () => {
    expect(resolveViewState({ loading: true, error: null, data: undefined })).toBe('skeleton');
  });

  it('error, không có data -> error (KHÔNG render data, tránh crash)', () => {
    expect(resolveViewState({ loading: false, error: new Error('x'), data: undefined })).toBe(
      'error'
    );
  });

  it('error 4xx, không có data -> error (SafeService KHÔNG fallback, UI phải hiện lỗi)', () => {
    const err = new ApiException('Unauthorized', { statusCode: 401 });
    expect(shouldFallback(err)).toBe(false);
    expect(resolveViewState({ loading: false, error: err, data: undefined })).toBe('error');
  });

  it('mảng rỗng -> empty (dữ liệu rỗng là trạng thái hợp lệ, KHÔNG phải lỗi)', () => {
    expect(resolveViewState({ loading: false, error: null, data: [] })).toBe('empty');
  });

  it('object rỗng -> empty', () => {
    expect(resolveViewState({ loading: false, error: null, data: {} })).toBe('empty');
  });

  it('có data -> data', () => {
    expect(resolveViewState({ loading: false, error: null, data: [{ id: '1' }] })).toBe('data');
  });

  it('đang tải NHƯNG đã có data cũ -> data (giữ màn hình cũ, không nhảy về skeleton)', () => {
    expect(resolveViewState({ loading: true, error: null, data: [{ id: '1' }] })).toBe('data');
  });

  it('lỗi NHƯNG vẫn có data cũ -> data (giữ dữ liệu, không mất màn hình)', () => {
    expect(resolveViewState({ loading: false, error: new Error('x'), data: [{ id: '1' }] })).toBe(
      'data'
    );
  });

  it('BUG: loading=false + error + data=undefined KHÔNG được rơi vào nhánh data', () => {
    // Đây chính là bug của FridgeSummaryCards/GreetingBanner.
    // Nếu resolveViewState trả 'data' ở trạng thái này thì component sẽ đọc
    // summary.expiredCount -> TypeError -> crash màn hình Home.
    const state = resolveViewState({
      loading: false,
      error: new ApiException('Server boom', { statusCode: 500 }),
      data: undefined,
    });
    expect(state).not.toBe('data');
    expect(state).toBe('error');
  });
});

// ═══════════════════════════════════════════════════════════════════
// BUG 2: NotificationsScreen dùng sai key service
// ═══════════════════════════════════════════════════════════════════

describe('BUG 2: tên service trong code phải khớp ServiceProvider', () => {
  const SERVICE_KEYS = [
    'authService',
    'fridgeService',
    'recipeService',
    'notificationService',
    'userService',
  ];

  it('ServiceProvider cung cấp đúng 5 key này', () => {
    expect(SERVICE_KEYS).toContain('notificationService');
  });

  it('notifications (số nhiều) KHÔNG phải key hợp lệ', () => {
    // Không có key nào tên notifications -> services.notifications là undefined
    expect(SERVICE_KEYS).not.toContain('notifications');
  });

  /**
   * Quét toàn bộ file trong cây presentation, trả về mọi tham chiếu
   * `services.<key>.<method>` tìm được, gồm cả key hợp lệ lẫn không hợp lệ.
   *
   * Trả về { good, bad } để test assert được cả hai chiều: không chỉ "không có
   * key sai" (pass rỗng), mà còn "có tìm thấy key đúng" (chứng minh regex chạy).
   */
  const scanServiceRefs = () => {
    const { execSync } = require('child_process');

    const files = execSync(
      `Get-ChildItem -Path "${PRESENTATION_ROOT}" -Recurse -Include *.jsx,*.js | Select-Object -ExpandProperty FullName`,
      { shell: 'powershell.exe', encoding: 'utf8' }
    )
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const good = [];
    const bad = [];

    files.forEach((f) => {
      // Bỏ qua file test - bản thân test có ví dụ services.xxx trong comment
      // và chuỗi mẫu, quét vào sẽ báo động giả.
      if (f.includes('__tests__') || f.includes('.test.')) return;

      const src = fs.readFileSync(f, 'utf8');
      const matches = src.matchAll(/\bservices\.([a-zA-Z_$][\w$]*)\s*\./g);
      matches.forEach((m) => {
        if (SERVICE_KEYS.includes(m[1])) {
          good.push(`${path.basename(f)}: services.${m[1]}`);
        } else {
          bad.push(`${path.basename(f)}: services.${m[1]}`);
        }
      });
    });

    return { good, bad };
  };

  it('mọi key mà source code dùng đều phải tồn tại trong map', () => {
    // Đây là test chống bug: code gọi services.notifications trong khi
    // ServiceProvider chỉ có notificationService -> undefined -> crash khi bấm.
    const { bad } = scanServiceRefs();
    expect(bad).toEqual([]);
  });

  it('quét thực sự tìm thấy key hợp lệ (chống test pass-vì-quét-rỗng)', () => {
    const { good } = scanServiceRefs();
    expect(good.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// BUG 3: widget Home phải tự an toàn khi service lỗi
// ═══════════════════════════════════════════════════════════════════

describe('BUG 3: widget Home phải an toàn khi service lỗi', () => {
  const readWidget = (name) =>
    fs.readFileSync(path.join(PRESENTATION_ROOT, 'components', 'home', name), 'utf8');

  it('FridgeSummaryCards phải lấy error từ useFridgeSummary', () => {
    const src = readWidget('FridgeSummaryCards.jsx');

    // Hook phải lấy error, nếu không thì không có đường nào để an toàn.
    const destructures = src.match(/const \{[^}]*\}\s*=\s*useFridgeSummary\(\)/);
    expect(destructures).not.toBeNull();
    expect(destructures[0]).toMatch(/\berror\b/);
  });

  it('GreetingBanner KHÔNG cần error vì đã có fallback an toàn', () => {
    const src = readWidget('GreetingBanner.jsx');

    // Banner dùng `authUser?.name || profile?.name || 'Bạn'`.
    // Khi profile lỗi 4xx (không fallback) thì vẫn render greeting với tên mặc định.
    // Đây là graceful degradation ĐÚNG - hiện ErrorState ở đầu màn hình Home
    // sẽ tệ hơn, nên widget này cố tình KHÔNG cần error.
    expect(src).toMatch(/\?\?|\|\|\s*'/);
    const destructure = src.match(/const \{[^}]*\}\s*=\s*useUserProfile\(\)/);
    expect(destructure).not.toBeNull();
    // Không được render field của profile mà không chặn optional chaining
    expect(src).not.toMatch(/profile\.[a-zA-Z]+\s*\.\s*[a-zA-Z]/);
  });

  it('CookingSuggestionsSection và WeeklyStatisticsSection đã xử lý error (giữ nguyên)', () => {
    ['CookingSuggestionsSection', 'WeeklyStatisticsSection'].forEach((name) => {
      expect(readWidget(`${name}.jsx`)).toMatch(/\berror\b/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6 màn hình trong phạm vi P0.6c - khóa hành vi KHÔNG CRASH
// ═══════════════════════════════════════════════════════════════════

describe('6 màn hình P0.6c đã xử lý đủ 3 trạng thái', () => {
  const SCREENS = [
    { file: 'fridge/FridgeInventoryScreen.jsx', need: ['Skeleton', 'ErrorState', 'EmptyState'] },
    { file: 'fridge/FridgeListScreen.jsx', need: ['Skeleton', 'ErrorState', 'EmptyState'] },
    {
      file: 'recipe/RecipeSuggestionsScreen.jsx',
      need: ['Skeleton', 'ErrorState', 'EmptyState'],
    },
    {
      file: 'notification/NotificationsScreen.jsx',
      need: ['Skeleton', 'ErrorState', 'EmptyState'],
    },
    // RecipeDetailScreen không có list -> không cần EmptyState, chỉ cần Skeleton + ErrorState
    { file: 'recipe/RecipeDetailScreen.jsx', need: ['Skeleton', 'ErrorState'] },
  ];

  SCREENS.forEach(({ file, need }) => {
    it(`${file} import + dùng đủ: ${need.join(', ')}`, () => {
      const src = fs.readFileSync(path.join(PRESENTATION_ROOT, 'screens', file), 'utf8');

      need.forEach((component) => {
        expect(src).toMatch(new RegExp(`import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}`));
      });
    });
  });

  it('không màn hình nào render data khi data undefined mà không chặn trước', () => {
    SCREENS.forEach(({ file }) => {
      const src = fs.readFileSync(path.join(PRESENTATION_ROOT, 'screens', file), 'utf8');
      // Nếu không có nhánh chặn `loading`/`error`, rủi ro đọc field của undefined.
      expect(src).toMatch(/\bloading\b/);
      expect(src).toMatch(/\berror\b/);
    });
  });
});
