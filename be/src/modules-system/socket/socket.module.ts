/**
 * SocketModule — Module hệ thống WebSocket (Socket.IO)
 *
 * @Global: SocketService tự động available trong toàn bộ app.
 * SocketService vừa là @WebSocketGateway vừa là @Injectable service.
 */
import { Global, Module } from '@nestjs/common';
import { TokensModule } from 'src/modules-system/tokens/tokens.module';
import { SocketService } from './socket.service';

@Global()
@Module({
  imports: [
    TokensModule, // TokensService.verifyAccessToken() để xác thực JWT khi connect
  ],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
