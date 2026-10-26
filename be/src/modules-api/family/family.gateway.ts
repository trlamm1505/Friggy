/**
 * FamilyGateway — Socket.IO WebSocket Gateway
 *
 * Namespace: /family
 * Auth: JWT token qua handshake.auth.token
 * Room: family:{familyGroupId}
 *
 * Nhiệm vụ duy nhất:
 *   1. Xác thực JWT khi client kết nối
 *   2. Tự động join room family:{familyGroupId}
 *   3. Đăng ký Server instance vào SocketService (afterInit)
 *
 * Toàn bộ logic broadcast nằm trong SocketService.
 */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { SocketService } from 'src/modules-system/socket/socket.service';

@WebSocketGateway({
  namespace: '/family',
  cors: { origin: '*' },
})
export class FamilyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(FamilyGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  afterInit() {
    // Đăng ký server instance vào SocketService để các service khác dùng
    this.socketService.setServer(this.server);
    this.logger.log('[FamilyGateway] Socket.IO namespace /family initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload.sub;

      // Tìm familyGroupId của user (owner hoặc active member)
      const familyGroupId = await this.resolveFamilyGroupId(userId);

      if (!familyGroupId) {
        // User không thuộc gia đình nào — vẫn kết nối nhưng không join room
        client.data.userId = userId;
        this.logger.log(`[FamilyGateway] Connected without family: userId=${userId}`);
        return;
      }

      const room = `family:${familyGroupId}`;
      await client.join(room);
      client.data.userId = userId;
      client.data.familyGroupId = familyGroupId;

      this.logger.log(
        `[FamilyGateway] Connected: userId=${userId}, room=${room}, socketId=${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`[FamilyGateway] Auth failed: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[FamilyGateway] Disconnected: userId=${client.data?.userId}, socketId=${client.id}`,
    );
  }

  // ─────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────

  private async resolveFamilyGroupId(userId: string): Promise<string | null> {
    const ownedGroup = await this.prisma.familyGroup.findUnique({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });
    if (ownedGroup?.status === 'active') return ownedGroup.id;

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, status: 'active' },
      select: { familyGroupId: true },
    });
    return membership?.familyGroupId ?? null;
  }
}
