/**
 * SocketModule — Module hệ thống WebSocket (Socket.IO)
 *
 * @Global: SocketService tự động available trong toàn bộ app,
 * các module khác không cần import SocketModule thủ công.
 *
 * FamilyGateway.afterInit() sẽ gọi socketService.setServer(this.server)
 * để đăng ký Server instance vào SocketService.
 */
import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service';

@Global()
@Module({
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
