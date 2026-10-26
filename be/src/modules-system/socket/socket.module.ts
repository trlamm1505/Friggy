/**
 * SocketModule — Module hệ thống WebSocket (Socket.IO)
 *
 * @Global: SocketService tự động available trong toàn bộ app.
 * SocketService vừa là @WebSocketGateway vừa là @Injectable service.
 */
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocketService } from './socket.service';

@Global()
@Module({
  imports: [
    JwtModule.register({}), // JwtService để verify token khi connect
  ],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
