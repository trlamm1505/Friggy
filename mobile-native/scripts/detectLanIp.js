/**
 * detectLanIp - Tự động tìm IP LAN của máy host.
 *
 * Dùng cùng cơ chế với Expo CLI (`@expo/cli` -> `utils/ip.js` -> package `lan-network`),
 * nhưng fallback về cách đơn giản hơn (UDP socket trick) nếu package không
 * resolve được — tránh phụ thuộc cứng vào node_modules của Expo.
 *
 * Mục đích: script `start:lan` dùng IP này để trỏ `EXPO_PUBLIC_API_BASE_URL`
 * về BE local, giúp không phải sửa `.env` mỗi khi đổi mạng.
 */

/**
 * Cách 1: package `lan-network` (giống hệt Expo CLI dùng để bind dev server).
 * Chọn interface có `internal === false` và IPv4.
 *
 * @returns {Promise<{address: string, iname: string|null}|null>}
 */
async function detectViaLanNetwork() {
  let lanNetwork;
  try {
    lanNetwork = require('lan-network');
  } catch {
    return null;
  }

  try {
    const info = await lanNetwork.lanNetwork({ noDhcp: true });
    if (info && !info.internal && info.family === 'IPv4' && info.address) {
      return { address: info.address, iname: info.iname ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cách 2: UDP socket trick — mở socket UDP "connect" tới địa chỉ ngoài (không
 * gửi gói tin thật), đọc `socket.address().address` để biết IP mà OS chọn để
 * đi ra internet. Đây chính là IP mà điện thoại cùng Wi-Fi sẽ gọi tới.
 *
 * @returns {Promise<string|null>}
 */
function detectViaUdpSocket() {
  return new Promise((resolve) => {
    let dgram;
    try {
      dgram = require('dgram');
    } catch {
      resolve(null);
      return;
    }

    const socket = dgram.createSocket('udp4');
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch {
        // socket chưa từng mở -> bỏ qua
      }
      resolve(value);
    };

    // Timeout 1.5s: nếu mạng chặn outbound UDP thì vẫn trả null.
    const timer = setTimeout(() => finish(null), 1500);

    socket.on('error', () => {
      clearTimeout(timer);
      finish(null);
    });

    try {
      socket.connect(53, '8.8.8.8', () => {
        clearTimeout(timer);
        const { address } = socket.address();
        finish(address && address !== '0.0.0.0' ? address : null);
      });
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

/**
 * Tự động tìm IP LAN, ưu tiên `lan-network`, fallback UDP socket.
 *
 * @returns {Promise<string|null>} IPv4 hoặc null nếu không tìm được
 */
async function detectLanIp() {
  const viaPackage = await detectViaLanNetwork();
  if (viaPackage) return viaPackage.address;

  return detectViaUdpSocket();
}

module.exports = { detectLanIp };
