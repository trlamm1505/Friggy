/**
 * SocketModule — Module hệ thống WebSocket (Socket.IO)
 *
 * Không phải @Global vì không export service nào.
 * Chỉ dùng để group các Gateway vào một chỗ nếu cần mở rộng sau này.
 *
 * Hiện tại FamilyGateway được đăng ký trong FamilyModule.
 * SocketIoAdapter được gắn vào app trong main.ts.
 *
 * Cách dùng trong main.ts:
 *   import { SocketIoAdapter } from './modules-system/socket/socket-io.adapter';
 *   app.useWebSocketAdapter(new SocketIoAdapter(app));
 */
import { Module } from '@nestjs/common';

@Module({})
export class SocketModule {}
