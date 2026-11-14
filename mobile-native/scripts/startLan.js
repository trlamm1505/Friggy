#!/usr/bin/env node
/**
 * start:lan - Chạy Expo dev server và tự động trỏ API về BE local.
 *
 * Vấn đề giải quyết:
 *   Mỗi khi đổi mạng (ra quán cà phê, về nhà, đổi Wi-Fi), IP LAN của máy
 *   host đổi theo -> phải sửa `EXPO_PUBLIC_API_BASE_URL` trong `.env` thủ công.
 *
 * Cách hoạt động:
 *   1. Tự detect IP LAN hiện tại (dùng `lan-network`, fallback UDP socket).
 *   2. Inject `EXPO_PUBLIC_API_BASE_URL` vào `process.env` của tiến trình con.
 *   3. Spawn `expo start --lan`.
 *
 * Vì sao inject qua `process.env` là đủ:
 *   - Expo CLI đọc `.env.local` trước, nhưng @expo/env KHÔNG ghi đè biến
 *     đã tồn tại trong shell env ("is already defined and IS NOT overwritten").
 *   - Ở chế độ dev, Expo SDK 57 inline `process.env.EXPO_PUBLIC_*` lúc
 *     runtime qua virtual module `expo/virtual/env` (hỗ trợ HMR), nên giá trị
 *     mới áp dụng ngay cả khi file .env có giá trị cũ.
 *
 * Cách dùng:
 *   npm run start:lan              # tự detect IP (khuyến nghị)
 *   npm run start:lan -- --clear   # truyền thêm flag cho expo
 *
 * Script tương đương: `npx expo start --lan` (chỉ khác ở chỗ tự set env).
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const { detectLanIp } = require('./detectLanIp');

// ── Cấu hình ────────────────────────────────────────────────────────────────

const API_PORT = process.env.FRIGGY_API_PORT || '6969';
const API_PATH = '/api/v1';

/**
 * Đọc port BE từ `.env.local` / `.env` nếu có, để không hardcode lệch với
 * cấu hình thực tế của dự án.
 *
 * @returns {string}
 */
function resolveApiPort() {
  if (process.env.FRIGGY_API_PORT) return process.env.FRIGGY_API_PORT;

  const root = path.resolve(__dirname, '..');
  for (const file of ['.env.local', '.env']) {
    try {
      const content = fs.readFileSync(path.join(root, file), 'utf8');
      const match = content.match(/EXPO_PUBLIC_API_BASE_URL\s*=\s*https?:\/\/[^:]+:(\d+)/);
      if (match) return match[1];
    } catch {
      // file không tồn tại -> bỏ qua
    }
  }
  return API_PORT;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const passthrough = process.argv.slice(2);

  // Nếu user đã chỉ định host mode khác (--tunnel / --localhost) thì không
  // ép `--lan`, tránh xung đột với flag của user.
  const hasHostFlag = passthrough.some((arg) =>
    ['--lan', '--tunnel', '--localhost', '--host'].includes(arg)
  );

  const port = resolveApiPort();
  const ip = await detectLanIp();

  if (!ip) {
    console.error(
      '\x1b[31m[friggy] Không tìm được IP LAN của máy host.\x1b[0m\n' +
        '  Có thể máy đang offline, hoặc VPN/Proxy đang chặn việc xác định IP.\n' +
        '  Hãy đặt thủ công: EXPO_PUBLIC_API_BASE_URL=http://<IP>:' +
        port +
        API_PATH +
        ' rồi chạy lại.\n'
    );
    process.exit(1);
  }

  const apiBaseUrl = `http://${ip}:${port}${API_PATH}`;

  // Inject env cho tiến trình con. @expo/env sẽ bỏ qua giá trị trong file
  // .env nếu biến đã có sẵn trong process.env.
  const env = {
    ...process.env,
    EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  };

  console.log('\x1b[32m[friggy]\x1b[0m IP LAN phát hiện: \x1b[1m%s\x1b[0m', ip);
  console.log('\x1b[32m[friggy]\x1b[0m API base URL:    \x1b[1m%s\x1b[0m', apiBaseUrl);
  console.log(
    '\x1b[90m[friggy] Điện thoại phải dùng CHUNG Wi-Fi với máy host để gọi được BE.\x1b[0m\n'
  );

  // Tìm binary expo để spawn trực tiếp (tránh qua shell -> hoạt động ổn trên Windows).
  const expoBin = path.resolve(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');

  if (!fs.existsSync(expoBin)) {
    console.error(
      '\x1b[31m[friggy] Không tìm thấy %s. Hãy chạy `npm install` trước.\x1b[0m',
      expoBin
    );
    process.exit(1);
  }

  const args = ['start', ...(hasHostFlag ? [] : ['--lan']), ...passthrough];
  const child = spawn(process.execPath, [expoBin, ...args], {
    stdio: 'inherit',
    env,
    cwd: path.resolve(__dirname, '..'),
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error('\x1b[31m[friggy] Không spawn được Expo CLI: %s\x1b[0m', err.message);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('\x1b[31m[friggy] Lỗi: %s\x1b[0m', err.message);
  process.exit(1);
});
