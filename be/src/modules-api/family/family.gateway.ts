/**
 * FamilyGateway — Socket.IO WebSocket Gateway
 *
 * Namespace: /family
 * Auth: JWT token qua handshake.auth.token
 * Room: family:{familyGroupId}
 *
 * Events phát ra (server → clients trong room):
 *   fridge:item_added       — Thêm thực phẩm mới
 *   fridge:item_updated     — Sửa số lượng / hạn sử dụng
 *   fridge:item_removed     — Xóa / dùng hết thực phẩm
 *   fridge:member_joined    — Thành viên mới tham gia (kèm merge đồ)
 *   meal:slot_completed     — Đánh dấu đã nấu xong 1 bữa
 *   shopping:item_toggled   — Tick đã mua 1 mặt hàng trong giỏ
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

export interface FamilyPayload {
  event: string;
  data: Record<string, unknown>;
}

@WebSocketGateway({
  namespace: '/family',
  cors: { origin: '*' },
})
export class FamilyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FamilyGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
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
        // User không thuộc gia đình nào — không join room, nhưng vẫn kết nối
        client.data.userId = userId;
        this.logger.log(`[FamilyGateway] Client connected without family: userId=${userId}`);
        return;
      }

      const room = `family:${familyGroupId}`;
      await client.join(room);
      client.data.userId = userId;
      client.data.familyGroupId = familyGroupId;

      this.logger.log(
        `[FamilyGateway] Client connected: userId=${userId}, room=${room}, socketId=${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`[FamilyGateway] Auth failed: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[FamilyGateway] Client disconnected: userId=${client.data?.userId}, socketId=${client.id}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Public broadcast methods — được gọi từ FridgeService, MealPlanService, etc.
  // ─────────────────────────────────────────────────────────────────────

  /** Phát sự kiện đến tất cả client trong room của một family */
  emitToFamily(familyGroupId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`family:${familyGroupId}`).emit(event, data);
  }

  /** Thực phẩm mới được thêm vào tủ lạnh gia đình */
  emitFridgeItemAdded(familyGroupId: string, item: Record<string, unknown>, addedByName: string) {
    this.emitToFamily(familyGroupId, 'fridge:item_added', { item, addedByName, ts: Date.now() });
  }

  /** Thực phẩm trong tủ lạnh được cập nhật */
  emitFridgeItemUpdated(
    familyGroupId: string,
    itemId: string,
    changes: Record<string, unknown>,
    version: number,
    updatedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_updated', {
      itemId,
      changes,
      version,
      updatedByName,
      ts: Date.now(),
    });
  }

  /** Thực phẩm bị xóa hoặc dùng hết */
  emitFridgeItemRemoved(
    familyGroupId: string,
    itemId: string,
    ingredientName: string,
    removedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_removed', {
      itemId,
      ingredientName,
      removedByName,
      ts: Date.now(),
    });
  }

  /** Thành viên mới tham gia & merge đồ cá nhân */
  emitMemberJoined(
    familyGroupId: string,
    memberEmail: string,
    mergedItemCount: number,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:member_joined', {
      memberEmail,
      mergedItemCount,
      ts: Date.now(),
    });
  }

  /** Một bữa ăn được đánh dấu hoàn thành, nguyên liệu đã trừ kho */
  emitMealSlotCompleted(
    familyGroupId: string,
    slotId: string,
    recipeTitle: string,
    consumedIngredients: Array<{ name: string; quantity: number; unit: string }>,
    completedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'meal:slot_completed', {
      slotId,
      recipeTitle,
      consumedIngredients,
      completedByName,
      ts: Date.now(),
    });
  }

  /** Một item trong danh sách mua sắm được tick / bỏ tick */
  emitShoppingItemToggled(
    familyGroupId: string,
    itemId: number,
    isPurchased: boolean,
    toggledByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'shopping:item_toggled', {
      itemId,
      isPurchased,
      toggledByName,
      ts: Date.now(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Trả về familyGroupId mà userId đang active trong đó.
   * Ưu tiên theo thứ tự: Owner → Active Member
   */
  private async resolveFamilyGroupId(userId: string): Promise<string | null> {
    // 1. Kiểm tra xem user có phải owner không
    const ownedGroup = await this.prisma.familyGroup.findUnique({
      where: { ownerId: userId },
      select: { id: true, status: true },
    });
    if (ownedGroup?.status === 'active') return ownedGroup.id;

    // 2. Kiểm tra xem user có phải active member không
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, status: 'active' },
      select: { familyGroupId: true },
    });
    return membership?.familyGroupId ?? null;
  }
}
