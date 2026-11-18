/**
 * SocketService — Socket.IO Gateway + Broadcast Service
 *
 * Namespace: /family
 * Auth: JWT token qua handshake.auth.token hoặc Authorization header
 * Room: family:{familyGroupId}
 *
 * Kết hợp @WebSocketGateway + @Injectable trong 1 class:
 *   - Xử lý connection lifecycle (auth, join room)
 *   - Chứa toàn bộ emit methods
 *   - Được export @Global để FridgeService, FamilyService, MealPlanningService inject
 *
 * Events phát ra (server → clients trong room):
 *   fridge:item_added       — Thêm thực phẩm mới
 *   fridge:item_updated     — Sửa số lượng / hạn sử dụng (kèm version mới)
 *   fridge:item_removed     — Xóa / dùng hết thực phẩm
 *   fridge:member_joined    — Thành viên mới tham gia, merge đồ cá nhân
 *   meal:slot_completed     — Đánh dấu nấu xong, nguyên liệu đã trừ kho
 *   shopping:item_toggled   — Tick đã mua 1 mặt hàng trong giỏ
 */
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { TokensService } from 'src/modules-system/tokens/tokens.service';

@Injectable()
@WebSocketGateway({
  namespace: '/family',
  cors: { origin: '*' },
})
export class SocketService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────

  afterInit() {
    this.logger.log('[SocketService] Socket.IO namespace /family initialized');
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

      const payload = this.tokensService.verifyAccessToken(token);
      if (!payload) {
        client.disconnect();
        return;
      }
      const userId = payload.sub;

      const familyGroupId = await this.resolveFamilyGroupId(userId);

      if (!familyGroupId) {
        client.data.userId = userId;
        this.logger.log(`[SocketService] Connected without family: userId=${userId}`);
        return;
      }

      const room = `family:${familyGroupId}`;
      await client.join(room);
      client.data.userId = userId;
      client.data.familyGroupId = familyGroupId;

      this.logger.log(
        `[SocketService] Connected: userId=${userId}, room=${room}, socketId=${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`[SocketService] Auth failed: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[SocketService] Disconnected: userId=${client.data?.userId}, socketId=${client.id}`,
    );
  }

  // ─────────────────────────────────────────────────────────
  // Core emit
  // ─────────────────────────────────────────────────────────

  emitToFamily(familyGroupId: string, event: string, data: Record<string, unknown>) {
    if (!this.server) return;
    this.server.to(`family:${familyGroupId}`).emit(event, data);
  }

  // ─────────────────────────────────────────────────────────
  // Domain events — Fridge
  // ─────────────────────────────────────────────────────────

  emitFridgeItemAdded(
    familyGroupId: string,
    item: Record<string, unknown>,
    addedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_added', { item, addedByName, ts: Date.now() });
  }

  emitFridgeItemUpdated(
    familyGroupId: string,
    itemId: string,
    changes: Record<string, unknown>,
    version: number,
    updatedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_updated', {
      itemId, changes, version, updatedByName, ts: Date.now(),
    });
  }

  emitFridgeItemRemoved(
    familyGroupId: string,
    itemId: string,
    ingredientName: string,
    removedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_removed', {
      itemId, ingredientName, removedByName, ts: Date.now(),
    });
  }

  emitMemberJoined(familyGroupId: string, memberEmail: string, mergedItemCount: number) {
    this.emitToFamily(familyGroupId, 'fridge:member_joined', {
      memberEmail, mergedItemCount, ts: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────
  // Domain events — Meal Planning
  // ─────────────────────────────────────────────────────────

  emitMealSlotCompleted(
    familyGroupId: string,
    slotId: string,
    recipeTitle: string,
    consumedIngredients: Array<{ name: string; quantity: number; unit: string }>,
    completedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'meal:slot_completed', {
      slotId, recipeTitle, consumedIngredients, completedByName, ts: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────
  // Domain events — Shopping List
  // ─────────────────────────────────────────────────────────

  emitShoppingItemToggled(
    familyGroupId: string,
    itemId: number,
    isPurchased: boolean,
    toggledByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'shopping:item_toggled', {
      itemId, isPurchased, toggledByName, ts: Date.now(),
    });
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
