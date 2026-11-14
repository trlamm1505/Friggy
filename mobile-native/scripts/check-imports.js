/**
 * Quét tất cả import named trong src/ và kiểm tra:
 *   1. File đích có tồn tại không?
 *   2. Named export đó có được export thật không?
 *
 * Đây chính là lớp bug gây crash runtime kiểu
 * "Cannot read property 'X' of undefined" (P0.7.1).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      walk(p);
    } else if (/\.(js|jsx)$/.test(e.name)) {
      files.push(p);
    }
  }
})(SRC);

const EXT = ['.js', '.jsx', '/index.js', '/index.jsx', ''];

function resolve(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // package - skip
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXT) {
    const cand = base + ext;
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  // ./foo -> ./foo.jsx  and  ./foo.js -> ./foo.jsx
  if (base.endsWith('.js')) {
    const alt = base.replace(/\.js$/, '.jsx');
    if (fs.existsSync(alt)) return alt;
  }
  return null;
}

// Trích named exports từ file target
function getExports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();

  // export const X / export let / export var / export function X / export class X
  const decl = /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = decl.exec(src))) names.add(m[1]);

  const fn = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  while ((m = fn.exec(src))) names.add(m[1]);

  const cls = /export\s+class\s+([A-Za-z_$][\w$]*)/g;
  while ((m = cls.exec(src))) names.add(m[1]);

  // export { A, B as C }
  const braced = /export\s*\{([^}]*)\}/g;
  while ((m = braced.exec(src))) {
    m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => {
        const parts = s.split(/\s+as\s+/);
        names.add((parts[1] || parts[0]).trim());
      });
  }

  // export * from './x'  -> lấy exports của file con
  const star = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = star.exec(src))) {
    const t = resolve(file, m[1]);
    if (t) getExports(t).forEach((n) => names.add(n));
  }

  if (/export\s+default/.test(src)) names.add('default');
  return names;
}

// Trích import statements
function parseImports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /import\s+([^;'"]+?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const clause = m[1].trim();
    const spec = m[2];
    if (/^\*\s+as\s+/.test(clause)) continue; // namespace import - luôn hợp lệ

    const braceMatch = clause.match(/\{([^}]*)\}/);
    if (!braceMatch) continue; // default import - không kiểm tra named

    const named = braceMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(/\s+as\s+/)[0].trim())
      .filter((s) => s && s !== 'type');
    out.push({ spec, named, line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

const problems = [];
let checked = 0;

for (const f of files) {
  let imports;
  try {
    imports = parseImports(f);
  } catch (e) {
    continue;
  }
  for (const imp of imports) {
    if (!imp.named.length) continue;
    // Bỏ qua package import (react, axios, lucide-react-native...) -
    // không phải bug named-export trong codebase.
    if (!imp.spec.startsWith('.')) continue;
    const target = resolve(f, imp.spec);
    checked += imp.named.length;
    const rel = path.relative(ROOT, f);
    if (!target) {
      problems.push({
        kind: 'MISSING_FILE',
        file: rel,
        line: imp.line,
        detail: `import từ "${imp.spec}" — FILE KHÔNG TỒN TẠI`,
      });
      continue;
    }
    const exports = getExports(target);
    const bad = imp.named.filter((n) => !exports.has(n));
    if (bad.length) {
      problems.push({
        kind: 'MISSING_EXPORT',
        file: rel,
        line: imp.line,
        detail: `import { ${bad.join(', ')} } từ "${imp.spec}" — KHÔNG được export (target: ${path
          .relative(ROOT, target)
          .replace(/\\/g, '/')})`,
      });
    }
  }
}

console.log(`Đã kiểm tra ${files.length} file, ${checked} named import.`);
console.log(`Vấn đề: ${problems.length}\n`);
const byKind = {};
problems.forEach((p) => {
  byKind[p.kind] = byKind[p.kind] || [];
  byKind[p.kind].push(p);
});
for (const [k, list] of Object.entries(byKind)) {
  console.log(`── ${k} (${list.length}) ──`);
  list.forEach((p) => console.log(`  ${p.file}:${p.line}\n     ${p.detail}`));
  console.log('');
}
