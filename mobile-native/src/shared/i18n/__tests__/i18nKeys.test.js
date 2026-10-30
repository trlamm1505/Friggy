/**
 * i18n — kiểm tra key thiếu / dư (rà soát Dev B).
 *
 * ⚠️ VÌ SAO CẦN:
 *   `t('home.aiError')` khi thiếu key -> i18next trả về chính chuỗi key
 *   ("home.aiError") -> UI hiện chữ lạ, không phải crash nhưng là bug UX.
 *   Key THỪA thì vô hại, nhưng key THIẾU là dấu hiệu dev quên dịch.
 *
 *   Test này đối chiếu key dùng trong code với key có trong en.json / vi.json.
 */

import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
// `src/shared/i18n/__tests__` -> `src` là 2 cấp lên.
const SRC_DIR = path.join(__dirname, '..', '..', '..');

const readLocale = (file) => JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));

/** Thu thập key phẳng (dùng dot path) từ object lồng. */
const flatten = (obj, prefix = '') => {
  const out = new Set();
  Object.entries(obj || {}).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full).forEach((k) => out.add(k));
    } else {
      out.add(full);
    }
  });
  return out;
};

/** Thu thập tất cả file .js/.jsx trong src (bỏ qua __tests__). */
const collectSourceFiles = (dir, acc = []) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') return;
      collectSourceFiles(full, acc);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      acc.push(full);
    }
  });
  return acc;
};

/** Tìm key `t('...')` trong source. */
const findUsedKeys = () => {
  const used = new Map(); // key -> [file]
  const files = collectSourceFiles(SRC_DIR);

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    // `t('a.b.c')` hoặc `t("a.b.c")` — bỏ qua template literal động.
    const regex = /\bt\(\s*['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"]/g;
    let match = regex.exec(content);
    while (match !== null) {
      const key = match[1];
      if (!used.has(key)) used.set(key, []);
      used.get(key).push(path.relative(SRC_DIR, file));
      match = regex.exec(content);
    }
  });

  return used;
};

describe('i18n — key dùng trong code phải tồn tại ở cả en.json và vi.json', () => {
  const en = flatten(readLocale('en.json'));
  const vi = flatten(readLocale('vi.json'));
  const used = findUsedKeys();

  it('có key dùng để kiểm tra (sanity check)', () => {
    expect(used.size).toBeGreaterThan(50);
  });

  it('mọi key dùng trong code đều có trong en.json', () => {
    const missing = [...used.keys()].filter((k) => !en.has(k)).sort();
    expect(missing).toEqual([]);
  });

  it('mọi key dùng trong code đều có trong vi.json', () => {
    const missing = [...used.keys()].filter((k) => !vi.has(k)).sort();
    expect(missing).toEqual([]);
  });

  it('en.json và vi.json có cùng tập key (không lệch nhau)', () => {
    const onlyEn = [...en].filter((k) => !vi.has(k)).sort();
    const onlyVi = [...vi].filter((k) => !en.has(k)).sort();

    expect({ onlyEn, onlyVi }).toEqual({ onlyEn: [], onlyVi: [] });
  });

  it('mọi key dùng trong code có giá trị KHÔNG RỖNG ở cả 2 ngôn ngữ', () => {
    const enRaw = readLocale('en.json');
    const viRaw = readLocale('vi.json');

    const getValue = (raw, dottedKey) =>
      dottedKey.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), raw);

    const empty = [...used.keys()]
      .filter((key) => {
        const enVal = getValue(enRaw, key);
        const viVal = getValue(viRaw, key);
        return (
          typeof enVal !== 'string' ||
          typeof viVal !== 'string' ||
          enVal.trim() === '' ||
          viVal.trim() === ''
        );
      })
      .sort();

    expect(empty).toEqual([]);
  });
});

/**
 * ⚠️ JSON cho phép key TRÙNG LẶP trong cùng object: parser giữ key CUỐI và
 * BỎ QUA key trước (không báo lỗi). -> Vô hình với test key-thiếu ở trên.
 *
 * Rà soát Dev B đã phát hiện 9 cặp key trùng trong `home`:
 *   `thisWeek`, `system`, `resultCount`, `step`, `mealBreakfast`, `mealLunch`,
 *   `mealDinner`, `mealSnack`, `aiSend`.
 * Một số cặp có GIÁ TRỊ KHÁC NHAU (vd `resultCount`: "results" vs "items",
 * `mealBreakfast`: "Bữa sáng" vs "Sáng") -> giá trị nào thắng phụ thuộc thứ
 * tự dòng trong file, cực kỳ dễ sai khi ai đó sửa file.
 *
 * Test này chặn key trùng phát sinh lại.
 */
describe('i18n — file locale không được có key trùng lặp', () => {
  const findDuplicateKeys = (file) => {
    const text = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
    const lines = text.split('\n');
    const seen = new Map();
    let currentNamespace = null;

    lines.forEach((line) => {
      const nsMatch = line.match(/^ {2}"([^"]+)":\s*\{/);
      if (nsMatch) {
        currentNamespace = nsMatch[1];
        return;
      }
      const keyMatch = line.match(/^ {4}"([^"]+)":/);
      if (keyMatch && currentNamespace) {
        const full = `${currentNamespace}.${keyMatch[1]}`;
        seen.set(full, (seen.get(full) || 0) + 1);
      }
    });

    return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key).sort();
  };

  it.each(['en.json', 'vi.json'])('%s không có key trùng lặp', (file) => {
    expect(findDuplicateKeys(file)).toEqual([]);
  });

  it('mọi file locale đều parse được thành JSON hợp lệ', () => {
    fs.readdirSync(LOCALES_DIR)
      .filter((f) => f.endsWith('.json'))
      .forEach((file) => {
        expect(() => JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'))).not.toThrow();
      });
  });
});
