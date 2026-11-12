/**
 * Fake SQLite cho test - mô phỏng đủ API `expo-sqlite` mà code offline dùng.
 *
 * ⚠️ VÌ SAO CẦN:
 *   `jest.setup.js` mock `expo-sqlite` bằng `jest.fn()` rỗng -> không test
 *   được logic offline (cache + hàng đợi) vì mọi query đều rỗng.
 *   Engine này hỗ trợ đúng tập lệnh SQL mà `DatabaseService`, `OfflineCache`
 *   và `OutboxQueue` sử dụng - KHÔNG phải SQL engine đầy đủ.
 *
 * CÁCH DÙNG:
 *   - `jest.setup.js` mock module `expo-sqlite` bằng `createExpoSqliteMock()`.
 *   - Test gọi `__resetFakeDb()` để xoá sạch dữ liệu giữa các test case.
 *   - Dữ liệu được chia theo TÊN DB (giống file thật) -> `openDatabaseAsync`
 *     nhiều lần vẫn thấy cùng dữ liệu, y như SQLite thật.
 *
 * CÁC LỆNH ĐƯỢC HỖ TRỢ:
 *   CREATE TABLE [IF NOT EXISTS] t (...)   - tạo bảng (cột lấy từ DDL)
 *   CREATE INDEX ...                       - bỏ qua
 *   DROP TABLE [IF EXISTS] t               - xoá bảng
 *   PRAGMA ...                             - bỏ qua
 *   INSERT [OR REPLACE] INTO t (cols) VALUES (?, ...)
 *   UPDATE t SET c=?, ... WHERE ...
 *   DELETE FROM t [WHERE ...]
 *   SELECT * | cols FROM t [WHERE ...] [ORDER BY ...] [GROUP BY ...]
 *
 * WHERE chỉ hỗ trợ: `col = ?`, `col = 'literal'`, nối bằng `AND`.
 */

/** Chia sẻ dữ liệu giữa các lần `openDatabaseAsync` (mô phỏng file thật). */
const stores = new Map();

const getStore = (name) => {
  if (!stores.has(name)) stores.set(name, { tables: new Map() });
  return stores.get(name);
};

/**
 * Xoá sạch toàn bộ DỮ LIỆU (giữ nguyên cấu trúc bảng + giữ nguyên object
 * `FakeDatabase` đang được cache trong `DatabaseService` / `OutboxQueue`).
 *
 * ⚠️ VÌ SAO KHÔNG `stores.clear()`:
 *   `DatabaseService` và `OutboxQueue` cache instance `FakeDatabase` (và nó giữ
 *   reference tới `store`). Xoá map sẽ khiến instance cũ vẫn trỏ tới store cũ
 *   -> dữ liệu cũ vẫn còn -> test sai. Xoá ROWS trong từng store giữ được
 *   tính đồng nhất với "xoá file DB rồi tạo lại" mà không phá cache.
 */
export const __resetFakeDb = () => {
  stores.forEach((store) => {
    store.tables.forEach((table) => {
      table.rows = [];
    });
  });
};

/** Tạo object table mới từ tên bảng. */
const createTable = (name) => ({ name, columns: [], rows: [] });

/**
 * Tách danh sách theo dấu phẩy, không cắt nhầm dấu phẩy trong ngoặc.
 * @param {string} text
 * @returns {string[]}
 */
const splitTopLevel = (text) => {
  const parts = [];
  let depth = 0;
  let current = '';
  let quote = null;

  for (const ch of text) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/**
 * Tên cột đầu tiên trong 1 định nghĩa cột.
 * "id TEXT PRIMARY KEY" -> "id"
 */
const parseColumnName = (def) => def.trim().split(/\s+/)[0];

/** Cột nào là PRIMARY KEY (để INSERT OR REPLACE hoạt động đúng). */
const primaryKeyColumns = (table) =>
  table.columns.filter((c) => /PRIMARY\s+KEY/i.test(c.definition));

/**
 * Phân tích danh sách giá trị trong `VALUES (?, 'x', 5)`.
 *
 * Trả về mảng "mô tả" từng giá trị: `{ kind: 'param' }` hoặc
 * `{ kind: 'literal', value: ... }`.
 *
 * @param {string} valuesText
 * @returns {Array<{kind:string, value?:any}>}
 */
const parseValueSpecs = (valuesText) =>
  splitTopLevel(valuesText).map((raw) => {
    const trimmed = raw.trim();
    if (trimmed === '?') return { kind: 'param' };
    if (trimmed.startsWith("'")) return { kind: 'literal', value: trimmed.slice(1, -1) };
    if (trimmed.startsWith('"')) return { kind: 'literal', value: trimmed.slice(1, -1) };
    if (trimmed.toUpperCase() === 'NULL') return { kind: 'literal', value: null };
    if (trimmed.toUpperCase() === 'TRUE') return { kind: 'literal', value: 1 };
    if (trimmed.toUpperCase() === 'FALSE') return { kind: 'literal', value: 0 };
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber)) return { kind: 'literal', value: asNumber };
    return { kind: 'literal', value: trimmed };
  });

/**
 * Đánh giá điều kiện WHERE đơn giản.
 *
 * Hỗ trợ: `col = ?`, `col = 'lit'`, `col LIKE ?`, `col IS NULL`,
 * `col IS NOT NULL`, nối bằng `AND` / `OR`.
 *
 * @param {object} row
 * @param {string} whereClause
 * @param {Array} params
 * @returns {boolean}
 */
const matchesWhere = (row, whereClause, params = []) => {
  if (!whereClause) return true;

  // Tách theo `OR` trước (độ ưu tiên cao hơn `AND` trong SQL).
  const orGroups = whereClause.split(/\s+OR\s+/i);

  return orGroups.some((orGroup) => {
    const conditions = orGroup.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const condition of conditions) {
      const trimmed = condition.trim();
      if (!trimmed) continue;

      // `col = ?`
      const eqMatch = trimmed.match(/^(\w+)\s*=\s*(\?|'[^']*'|"[^"]*"|\d+)$/);
      if (eqMatch) {
        const column = eqMatch[1];
        const raw = eqMatch[2];
        let expected;
        if (raw === '?') {
          expected = params[paramIndex];
          paramIndex += 1;
        } else if (raw.startsWith("'")) {
          expected = raw.slice(1, -1);
        } else if (raw.startsWith('"')) {
          expected = raw.slice(1, -1);
        } else {
          expected = Number(raw);
        }
        if (!valuesEqual(row[column], expected)) return false;
        continue;
      }

      // `col LIKE ?` (SQLite LIKE: `%` = 0..n ký tự, `_` = 1 ký tự)
      const likeMatch = trimmed.match(/^(\w+)\s+LIKE\s+(\?|'[^']*'|"[^"]*")$/i);
      if (likeMatch) {
        const column = likeMatch[1];
        const raw = likeMatch[2];
        let pattern;
        if (raw === '?') {
          pattern = String(params[paramIndex] ?? '');
          paramIndex += 1;
        } else {
          pattern = raw.slice(1, -1);
        }
        if (!likeMatchValue(row[column], pattern)) return false;
        continue;
      }

      // `col IS NOT NULL`
      const notNullMatch = trimmed.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
      if (notNullMatch) {
        const value = row[notNullMatch[1]];
        if (value === null || value === undefined) return false;
        continue;
      }

      // `col IS NULL`
      const nullMatch = trimmed.match(/^(\w+)\s+IS\s+NULL$/i);
      if (nullMatch) {
        const value = row[nullMatch[1]];
        if (value !== null && value !== undefined) return false;
        continue;
      }

      // Không hiểu điều kiện -> coi như không lọc (an toàn cho test).
    }

    return true;
  });
};

/**
 * So sánh 2 giá trị theo kiểu SQLite (TEXT vs số).
 * @param {any} actual
 * @param {any} expected
 * @returns {boolean}
 */
const valuesEqual = (actual, expected) => {
  if (actual === expected) return true;
  if (actual === null || actual === undefined) return false;
  if (expected === null || expected === undefined) return false;

  // So sánh số: '1' vs 1
  const aNum = Number(actual);
  const bNum = Number(expected);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum === bNum;

  return String(actual) === String(expected);
};

/**
 * Đánh giá điều kiện `LIKE`.
 * @param {any} value
 * @param {string} pattern
 * @returns {boolean}
 */
const likeMatchValue = (value, pattern) => {
  if (value === null || value === undefined) return false;

  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // `%` -> `.*`, `_` -> `.`
  const regex = new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
  return regex.test(String(value));
};

/** Parse mệnh đề ORDER BY -> hàm so sánh. */
const buildComparator = (orderClause) => {
  if (!orderClause) return null;

  const parts = orderClause.split(',').map((p) => p.trim());
  const specs = parts.map((part) => {
    const [column, direction] = part.split(/\s+/);
    return { column, desc: String(direction || 'ASC').toUpperCase() === 'DESC' };
  });

  return (a, b) => {
    for (const spec of specs) {
      const av = a[spec.column];
      const bv = b[spec.column];
      if (av === bv) continue;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av > bv ? 1 : -1;
      return spec.desc ? -cmp : cmp;
    }
    return 0;
  };
};

class FakeDatabase {
  constructor(store) {
    this.store = store;
    this._lastInsertRowId = 0;
    this._autoIncrement = new Map();
  }

  get tables() {
    return this.store.tables;
  }

  _getTable(name) {
    return this.tables.get(name) || null;
  }

  _requireTable(name) {
    const table = this._getTable(name);
    if (!table) throw new Error(`FakeSQLite: bảng "${name}" không tồn tại`);
    return table;
  }

  // ── execAsync: DDL ──
  async execAsync(sql) {
    const trimmed = String(sql).trim();

    const createTable = trimmed.match(
      /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*)\)\s*;?$/i
    );
    if (createTable) {
      const name = createTable[1];
      if (!this.tables.has(name)) {
        const table = createTable2(name, createTable[2]);
        this.tables.set(name, table);
      }
      return { lastInsertRowId: 0, changes: 0 };
    }

    const dropTable = trimmed.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+);?$/i);
    if (dropTable) {
      this.tables.delete(dropTable[1]);
      return { lastInsertRowId: 0, changes: 0 };
    }

    // CREATE INDEX / PRAGMA / BEGIN / COMMIT -> bỏ qua.
    return { lastInsertRowId: 0, changes: 0 };
  }

  // ── runAsync: INSERT / UPDATE / DELETE ──
  async runAsync(sql, params = []) {
    const trimmed = String(sql).trim();

    const insert = trimmed.match(
      /^INSERT\s+(OR\s+REPLACE\s+)?INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\);?$/i
    );
    if (insert) {
      const replace = Boolean(insert[1]);
      const tableName = insert[2];
      const columns = splitTopLevel(insert[3]).map((c) => parseColumnName(c));
      const table = this._requireTable(tableName);

      const row = {};
      const specs = parseValueSpecs(insert[4]);
      let paramIndex = 0;
      specs.forEach((spec, i) => {
        if (spec.kind === 'param') {
          row[columns[i]] = params[paramIndex];
          paramIndex += 1;
        } else {
          row[columns[i]] = spec.value;
        }
      });

      // Cột AUTOINCREMENT không có trong danh sách -> tự sinh.
      const autoCol = table.columns.find((c) => /AUTOINCREMENT/i.test(c.definition));
      if (autoCol && (row[autoCol.name] === undefined || row[autoCol.name] === null)) {
        const next = (this._autoIncrement.get(tableName) ?? 0) + 1;
        this._autoIncrement.set(tableName, next);
        row[autoCol.name] = next;
        this._lastInsertRowId = next;
      }

      if (replace) {
        const pkColumns = primaryKeyColumns(table);
        if (pkColumns.length > 0) {
          const pkNames = pkColumns.map((c) => parseColumnName(c.definition));
          const existingIndex = table.rows.findIndex((existing) =>
            pkNames.every((pk) => existing[pk] === row[pk])
          );
          if (existingIndex >= 0) {
            table.rows[existingIndex] = { ...table.rows[existingIndex], ...row };
            return { lastInsertRowId: 0, changes: 1 };
          }
        }
      }

      table.rows.push(row);
      return { lastInsertRowId: this._lastInsertRowId, changes: 1 };
    }

    const update = trimmed.match(/^UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+?);?$/i);
    if (update) {
      const table = this._requireTable(update[1]);

      // Mỗi assignment: `col = ?` (param) hoặc `col = 'lit'` / `col = 5` (literal).
      const assignmentSpecs = splitTopLevel(update[2]).map((a) => {
        const [column, rawValue] = a.split('=');
        const trimmedValue = String(rawValue ?? '').trim();
        if (trimmedValue === '?') return { column: column.trim(), kind: 'param' };
        if (trimmedValue.startsWith("'")) {
          return { column: column.trim(), kind: 'literal', value: trimmedValue.slice(1, -1) };
        }
        if (trimmedValue.toUpperCase() === 'NULL') {
          return { column: column.trim(), kind: 'literal', value: null };
        }
        const asNumber = Number(trimmedValue);
        if (!Number.isNaN(asNumber)) {
          return { column: column.trim(), kind: 'literal', value: asNumber };
        }
        return { column: column.trim(), kind: 'literal', value: trimmedValue };
      });

      const paramCount = assignmentSpecs.filter((s) => s.kind === 'param').length;
      const whereParams = params.slice(paramCount);

      let changes = 0;
      table.rows.forEach((row) => {
        if (!matchesWhere(row, update[3], whereParams)) return;
        let paramIndex = 0;
        assignmentSpecs.forEach((spec) => {
          if (spec.kind === 'param') {
            row[spec.column] = params[paramIndex];
            paramIndex += 1;
          } else {
            row[spec.column] = spec.value;
          }
        });
        changes += 1;
      });
      return { lastInsertRowId: 0, changes };
    }

    const del = trimmed.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+?))?;?$/i);
    if (del) {
      const table = this._requireTable(del[1]);
      if (!del[2]) {
        const changes = table.rows.length;
        table.rows = [];
        return { lastInsertRowId: 0, changes };
      }
      const keep = [];
      let changes = 0;
      table.rows.forEach((row) => {
        if (matchesWhere(row, del[2], params)) changes += 1;
        else keep.push(row);
      });
      table.rows = keep;
      return { lastInsertRowId: 0, changes };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  // ── getAllAsync: SELECT ──
  async getAllAsync(sql, params = []) {
    const trimmed = String(sql).trim();

    const select = trimmed.match(
      /^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+GROUP\s+BY\s+(\w+))?\s*;?$/i
    );
    if (!select) return [];

    const selectPart = select[1].trim();
    const tableName = select[2];
    const where = select[3];
    const orderBy = select[4];
    const groupBy = select[5];

    const table = this._getTable(tableName);
    if (!table) return [];

    let rows = table.rows.filter((row) => matchesWhere(row, where, params));

    // GROUP BY + COUNT
    if (groupBy) {
      const countMatch = selectPart.match(/COUNT\(\*\)\s+as\s+count/i);
      const groups = new Map();
      rows.forEach((row) => {
        const key = row[groupBy];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      });
      const out = Array.from(groups.entries()).map(([key, groupRows]) => {
        const result = { [groupBy]: key };
        if (countMatch) result.count = groupRows.length;
        return result;
      });
      const comparator = buildComparator(orderBy);
      if (comparator) out.sort(comparator);
      return out;
    }

    // COUNT(*) không GROUP BY
    const countOnly = selectPart.match(/^COUNT\(\*\)\s+as\s+count$/i);
    if (countOnly) {
      return [{ count: rows.length }];
    }

    const comparator = buildComparator(orderBy);
    if (comparator) rows = [...rows].sort(comparator);

    if (selectPart === '*') {
      return rows.map((row) => ({ ...row }));
    }

    // Chọn từng cột.
    const columns = splitTopLevel(selectPart).map((c) => c.split(/\s+as\s+/i)[0].trim());
    return rows.map((row) => {
      const out = {};
      columns.forEach((column) => {
        out[column] = row[column];
      });
      return out;
    });
  }

  // ── getFirstAsync ──
  async getFirstAsync(sql, params = []) {
    const rows = await this.getAllAsync(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // ── Transaction ──
  async withTransactionAsync(fn) {
    return fn();
  }

  async withExclusiveTransactionAsync(fn) {
    return fn();
  }

  async closeAsync() {
    return undefined;
  }
}

/** Tạo table từ tên + phần định nghĩa cột (dạng text). */
function createTable2(name, columnDefsText) {
  const table = createTable(name);
  table.columns = splitTopLevel(columnDefsText).map((definition) => ({
    name: parseColumnName(definition),
    definition,
  }));
  return table;
}

/**
 * Tạo object mock cho module `expo-sqlite`.
 * @returns {{openDatabaseAsync: Function}}
 */
export const createExpoSqliteMock = () => ({
  openDatabaseAsync: jest.fn(async (name) => new FakeDatabase(getStore(name))),
});

export default createExpoSqliteMock;
