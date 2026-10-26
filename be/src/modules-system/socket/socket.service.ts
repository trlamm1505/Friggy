/**
 * SocketService — Trung tâm quản lý Socket.IO server
 *
 * - Giữ reference đến Server instance (được set bởi FamilyGateway.afterInit)
 * - Chứa toàn bộ logic broadcast tới các room gia đình
 * - Được export ra dưới dạng @Global để FridgeService, MealPlanningService, etc. inject trực tiếp
 *
 * Events phát ra (server → clients trong room):
 *   fridge:item_added       — Thêm thực phẩm mới
 *   fridge:item_updated     — Sửa số lượng / hạn sử dụng (kèm version mới)
 *   fridge:item_removed     — Xóa / dùng hết thực phẩm
 *   fridge:member_joined    — Thành viên mới tham gia, merge đồ cá nhân
 *   meal:slot_completed     — Đánh dấu nấu xong, nguyên liệu đã trừ kho
 *   shopping:item_toggled   — Tick đã mua 1 mặt hàng trong giỏ
 */
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private server: Server | null = null;

  // ─────────────────────────────────────────────────────────
  // Server lifecycle
  // ─────────────────────────────────────────────────────────

  /** Được gọi từ FamilyGateway.afterInit để đăng ký server instance */
  setServer(server: Server) {
    this.server = server;
    this.logger.log('[SocketService] Server instance registered');
  }

  /** Kiểm tra server đã sẵn sàng chưa (dùng để guard emit) */
  isReady(): boolean {
    return this.server !== null;
  }

  // ─────────────────────────────────────────────────────────
  // Core emit
  // ─────────────────────────────────────────────────────────

  /** Phát sự kiện đến tất cả client trong room của một family */
  emitToFamily(familyGroupId: string, event: string, data: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn(`[SocketService] Server not ready, skipped event: ${event}`);
      return;
    }
    this.server.of('/family').to(`family:${familyGroupId}`).emit(event, data);
  }

  // ─────────────────────────────────────────────────────────
  // Domain events — Fridge
  // ─────────────────────────────────────────────────────────

  /** Thực phẩm mới được thêm vào tủ lạnh gia đình */
  emitFridgeItemAdded(
    familyGroupId: string,
    item: Record<string, unknown>,
    addedByName: string,
  ) {
    this.emitToFamily(familyGroupId, 'fridge:item_added', {
      item,
      addedByName,
      ts: Date.now(),
    });
  }

  /** Thực phẩm trong tủ lạnh được cập nhật (kèm version mới để FE sync Optimistic UI) */
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

  /** Thành viên mới tham gia & merge đồ cá nhân vào tủ gia đình */
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

  // ─────────────────────────────────────────────────────────
  // Domain events — Meal Planning
  // ─────────────────────────────────────────────────────────

  /** Một bữa ăn hoàn thành — nguyên liệu đã trừ kho FIFO */
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

  // ─────────────────────────────────────────────────────────
  // Domain events — Shopping List
  // ─────────────────────────────────────────────────────────

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
}
