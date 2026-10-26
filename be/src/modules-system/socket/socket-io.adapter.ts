/**
 * SocketIoAdapter — Custom WebSocket Adapter cho toàn ứng dụng
 *
 * Mục đích:
 *   - Ghi đè adapter mặc định của NestJS để cấu hình Socket.IO tập trung
 *   - Cho phép tùy chỉnh CORS, transports, ping timeout riêng
 *   - Được đăng ký một lần duy nhất trong main.ts
 *
 * Dùng:
 *   app.useWebSocketAdapter(new SocketIoAdapter(app));
 */
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',          // Production: thay bằng domain thực
        methods: ['GET', 'POST'],
        credentials: false,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 20000,     // 20s trước khi disconnect
      pingInterval: 10000,    // Gửi ping mỗi 10s
    });

    return server;
  }
}

