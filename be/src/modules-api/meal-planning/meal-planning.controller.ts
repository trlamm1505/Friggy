/**
 * MealPlanningController — Endpoints cho Meal Planning Module
 *
 * Prefix: /api/v1/meal-planning
 * Auth: JwtAuthGuard (tất cả endpoint cần đăng nhập)
 *
 * Flow tạo thực đơn bằng AI:
 *   1. POST /plans/generate → trả { jobId, streamUrl } ngay lập tức
 *   2. FE kết nối SSE: GET /plans/generate/:jobId/stream
 *   3. Server stream progress events qua SSE cho đến khi done/failed
 *   4. Sau khi done, FE gọi GET /plans để lấy kế hoạch vừa tạo
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AiUsageLimitGuard } from 'src/common/guards/ai-usage-limit.guard';
import { AiFeature } from 'src/common/decorators/ai-feature.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { MealPlanningService } from './meal-planning.service';
import {
  GenerateMealPlanDto,
  UpdateMealPlanDto,
  UpdateMealSlotDto,
  CreateShoppingListDto,
  AddShoppingListItemDto,
  UpdateShoppingListItemDto,
  RegenerateSlotDto,
  GenerateFromExpiringDto,
} from './dto/meal-planning.dto';
import {
  GeneratePlanResponseDto,
  WeeklyPlanSummaryResponseDto,
  WeeklyPlanDetailResponseDto,
  ShoppingListResponseDto,
  UpdateMealSlotResponseDto,
} from './dto/meal-planning-response.dto';

@ApiTags('Meal Planning')
@ApiBearerAuth('access-token')
@Controller('meal-planning')
export class MealPlanningController {
  constructor(
    private readonly mealPlanningService: MealPlanningService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // POST /plans/generate — Đẩy job AI vào queue
  // ─────────────────────────────────────────────────────────

  @Post('plans/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageLimitGuard)
  @AiFeature('meal_plan')
  @ApiOperation({
    summary: '[AI] Tạo thực đơn tuần bằng AI (Multi-Agent)',
    description: `Không chờ AI xử lý xong. Job được đẩy vào queue, trả về jobId ngay lập tức.
    FE kết nối SSE endpoint /plans/generate/:jobId/stream để nhận tiến độ real-time.`,
  })
  @ApiResponse({ status: 202, description: 'Job đã được nhận vào queue', type: GeneratePlanResponseDto })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 429, description: 'Vượt giới hạn AI usage tuần này' })
  async generatePlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateMealPlanDto,
  ) {
    return this.mealPlanningService.generatePlan(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // GET /plans/generate/:jobId/stream — SSE stream tiến độ AI
  // ─────────────────────────────────────────────────────────

  @Get('plans/generate/:jobId/stream')
  @ApiOperation({
    summary: '[AI] SSE stream tiến độ tạo thực đơn',
    description: `Subscribe SSE để nhận tiến độ của job tạo thực đơn theo thời gian thực.
    Events: supervisor_start → agents_parallel_start → chef_start → evaluator_start → completed/failed`,
  })
  @ApiParam({ name: 'jobId', description: 'ID job nhận được từ POST /plans/generate' })
  @ApiResponse({ status: 200, description: 'SSE stream events (text/event-stream)' })
  async streamProgress(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    // Cấu hình header SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Tắt buffer của Nginx
    res.flushHeaders();

    const channel = `meal_plan:${jobId}:progress`;

    // Tạo subscriber riêng (không dùng chung client đang publish)
    const subscriber = this.redis.createSubscriber();

    await subscriber.subscribe(channel);

    // Hàm gửi event SSE về FE
    const sendEvent = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { message: 'Đã kết nối, đang chờ tiến độ...', jobId });

    subscriber.on('message', (_channel: string, rawMessage: string) => {
      try {
        const payload = JSON.parse(rawMessage);
        const { step, ...data } = payload;

        sendEvent(step, data);

        // Đóng kết nối khi pipeline hoàn thành hoặc thất bại
        if (step === 'completed' || step === 'failed') {
          subscriber.unsubscribe(channel);
          subscriber.quit();
          res.end();
        }
      } catch {
        // Bỏ qua message không parse được
      }
    });

    // Dọn dẹp khi FE ngắt kết nối
    res.on('close', () => {
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    });

    // Timeout 10 phút nếu AI quá lâu không xong
    const timeout = setTimeout(() => {
      sendEvent('failed', { message: 'Hết thời gian chờ (10 phút)', timeout: true });
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
      res.end();
    }, 10 * 60 * 1000);

    res.on('close', () => clearTimeout(timeout));
  }

  // ─────────────────────────────────────────────────────────
  // GET /plans — Danh sách kế hoạch tuần
  // ─────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'Danh sách kế hoạch tuần của tôi' })
  @ApiResponse({ status: 200, description: 'Danh sách kế hoạch', type: [WeeklyPlanSummaryResponseDto] })
  async getPlans(@CurrentUser() user: JwtPayload) {
    return this.mealPlanningService.getPlans(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET /plans/:id — Chi tiết kế hoạch
  // ─────────────────────────────────────────────────────────

  @Get('plans/:id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch tuần (kèm daily plan + meal slots)' })
  @ApiResponse({ status: 200, type: WeeklyPlanDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy kế hoạch' })
  async getPlanDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id') planId: string,
  ) {
    return this.mealPlanningService.getPlanDetail(user.sub, planId);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /plans/:id — Cập nhật trạng thái kế hoạch
  // ─────────────────────────────────────────────────────────

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Cập nhật trạng thái kế hoạch (confirmed/active/completed)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật' })
  async updatePlan(
    @CurrentUser() user: JwtPayload,
    @Param('id') planId: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.mealPlanningService.updatePlan(user.sub, planId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /plans/:id — Xóa mềm kế hoạch
  // ─────────────────────────────────────────────────────────

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Xóa kế hoạch (soft delete)' })
  @ApiResponse({ status: 200, description: 'Đã xóa' })
  async deletePlan(
    @CurrentUser() user: JwtPayload,
    @Param('id') planId: string,
  ) {
    return this.mealPlanningService.deletePlan(user.sub, planId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /slots/:id — Chi tiết slot: công thức + nguyên liệu + fridge analysis
  // ─────────────────────────────────────────────────────────

  @Get('slots/:id')
  @ApiOperation({
    summary: 'Chi tiết meal slot: công thức nấu + nguyên liệu + phân tích tủ lạnh',
    description:
      'Trả về các bước nấu ăn, danh sách nguyên liệu cần dùng (đã scale theo servings), ' +
      'và trạng thái have/partial/missing theo tủ lạnh hiện tại. ' +
      'Dùng summary.missingItems để hiển thị những gì cần mua thêm.',
  })
  @ApiParam({ name: 'id', description: 'ID của meal slot' })
  @ApiResponse({ status: 200, description: 'Chi tiết slot thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  @ApiResponse({ status: 404, description: 'Slot không tồn tại hoặc không thuộc user' })
  async getSlotDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id') slotId: string,
  ) {
    return this.mealPlanningService.getSlotDetail(user.sub, slotId);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /slots/:id — Cập nhật meal slot (đổi món / tick đã nấu)
  // ─────────────────────────────────────────────────────────

  @Patch('slots/:id')
  @ApiOperation({ summary: 'Cập nhật meal slot — đổi công thức hoặc tick đã nấu xong' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật slot' })
  @ApiOkResponse({ type: UpdateMealSlotResponseDto })
  async updateSlot(
    @CurrentUser() user: JwtPayload,
    @Param('id') slotId: string,
    @Body() dto: UpdateMealSlotDto,
  ) {
    return this.mealPlanningService.updateSlot(user.sub, slotId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // GET /shopping-lists — Danh sách mua sắm
  // ─────────────────────────────────────────────────────────

  @Get('shopping-lists')
  @ApiOperation({ summary: 'Danh sách mua sắm của tôi (kèm items)' })
  @ApiResponse({ status: 200, type: [ShoppingListResponseDto] })
  async getShoppingLists(@CurrentUser() user: JwtPayload) {
    return this.mealPlanningService.getShoppingLists(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /shopping-lists — Tạo danh sách mua từ kế hoạch
  // ─────────────────────────────────────────────────────────

  @Post('shopping-lists')
  @ApiOperation({ summary: 'Tạo danh sách mua sắm tự động từ kế hoạch tuần' })
  @ApiResponse({ status: 201, description: 'Danh sách mua đã tạo', type: ShoppingListResponseDto })
  async createShoppingList(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateShoppingListDto,
  ) {
    return this.mealPlanningService.createShoppingList(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /shopping-lists/:listId/items/:itemId — Tick đã mua / sửa lượng
  // ─────────────────────────────────────────────────────────
  //
  // ⚠️ CHỈ CÓ MỘT ROUTE PATCH DUY NHẤT cho path này.
  //    Trước đây có 2 handler cùng path (một để TOGGLE, một để sửa lượng).
  //    NestJS match theo thứ tự đăng ký -> handler đầu tiên ("toggle") luôn
  //    thắng, handler "update" KHÔNG BAO GIỜ chạy -> sửa số lượng vô hiệu.
  //    => Gộp lại 1 handler, dispatch dựa trên body:
  //      - Body RỖNG            -> TOGGLE (giữ hành vi cũ: tick "đã mua" sẽ
  //                                 tự thêm món vào tủ lạnh).
  //      - Body có quantity hoặc isPurchased -> sửa lượng / set trạng thái
  //                                 (KHÔNG tự thêm vào tủ lạnh).
  @Patch('shopping-lists/:listId/items/:itemId')
  @ApiOperation({
    summary: 'Đánh dấu đã mua / chưa mua hoặc sửa số lượng mặt hàng',
    description:
      'Gửi body rỗng -> TOGGLE trạng thái (và tự thêm món vào tủ lạnh khi tick "đã mua"). ' +
      'Gửi { quantity } hoặc { isPurchased } -> sửa lượng / set trạng thái (không tự thêm vào tủ lạnh).',
  })
  @ApiParam({ name: 'listId', description: 'ID danh sách mua' })
  @ApiParam({ name: 'itemId', description: 'ID mặt hàng (số nguyên)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật' })
  async updateShoppingItem(
    @CurrentUser() user: JwtPayload,
    @Param('listId') listId: string,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateShoppingListItemDto,
  ) {
    const hasExplicitUpdate =
      dto?.quantity !== undefined || dto?.isPurchased !== undefined;

    if (!hasExplicitUpdate) {
      return this.mealPlanningService.toggleShoppingItem(user.sub, listId, itemId);
    }

    return this.mealPlanningService.updateShoppingListItem(user.sub, listId, itemId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // GET /shopping-lists/active — Lấy (hoặc tạo) giỏ mua mặc định
  // ─────────────────────────────────────────────────────────

  @Get('shopping-lists/active')
  @ApiOperation({
    summary: 'Giỏ mua đang dùng (tự tạo nếu chưa có)',
    description:
      'Dùng cho nút "+ Thêm vào DS" ở màn công thức: cần 1 list để thêm mặt hàng ' +
      'vào. Nếu user chưa tạo list nào thì tạo 1 list rỗng làm giỏ mặc định.',
  })
  @ApiResponse({ status: 200, type: ShoppingListResponseDto })
  async getActiveShoppingList(@CurrentUser() user: JwtPayload) {
    return this.mealPlanningService.getOrCreateActiveShoppingList(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST /shopping-lists/:listId/items — Thêm 1 mặt hàng
  // ─────────────────────────────────────────────────────────

  @Post('shopping-lists/:listId/items')
  @ApiOperation({
    summary: 'Thêm 1 mặt hàng vào danh sách mua',
    description:
      'Nếu mặt hàng cùng nguyên liệu đã có trong list thì GỘP lượng thay vì tạo dòng mới.',
  })
  @ApiParam({ name: 'listId', description: 'ID danh sách mua' })
  @ApiResponse({ status: 201, description: 'Đã thêm mặt hàng' })
  async addShoppingListItem(
    @CurrentUser() user: JwtPayload,
    @Param('listId') listId: string,
    @Body() dto: AddShoppingListItemDto,
  ) {
    return this.mealPlanningService.addShoppingListItem(user.sub, listId, dto);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /shopping-lists/:listId/items/:itemId — Xoá mặt hàng
  // ─────────────────────────────────────────────────────────

  @Delete('shopping-lists/:listId/items/:itemId')
  @ApiOperation({ summary: 'Xoá 1 mặt hàng khỏi danh sách mua (soft delete)' })
  @ApiParam({ name: 'listId', description: 'ID danh sách mua' })
  @ApiParam({ name: 'itemId', description: 'ID mặt hàng (số nguyên)' })
  @ApiResponse({ status: 200, description: 'Đã xoá' })
  async removeShoppingListItem(
    @CurrentUser() user: JwtPayload,
    @Param('listId') listId: string,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.mealPlanningService.removeShoppingListItem(user.sub, listId, itemId);
  }

  // ─────────────────────────────────────────────────────────
  // POST /slots/:id/missing-to-shopping-list
  // ─────────────────────────────────────────────────────────

  @Post('slots/:id/missing-to-shopping-list')
  @ApiOperation({
    summary: 'Thêm nguyên liệu còn thiếu của 1 slot vào danh sách mua',
    description:
      'Dùng cho nút "+ Thêm vào DS" ở màn chi tiết công thức / meal plan: ' +
      'ghi mọi nguyên liệu mà tủ lạnh đang thiếu vào giỏ mua.',
  })
  @ApiParam({ name: 'id', description: 'ID meal slot' })
  @ApiResponse({ status: 201, description: 'Đã thêm vào danh sách mua' })
  async addSlotMissingToShoppingList(
    @CurrentUser() user: JwtPayload,
    @Param('id') slotId: string,
  ) {
    return this.mealPlanningService.addSlotMissingToShoppingList(user.sub, slotId);
  }

  // ─────────────────────────────────────────────────────────
  // Phase 10.1 — POST /slots/:id/regenerate
  // ─────────────────────────────────────────────────────────

  @Post('slots/:id/regenerate')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageLimitGuard)
  @AiFeature('slot_regenerate')
  @ApiOperation({
    summary: '[AI] Gợi ý món thay thế cho 1 slot bữa ăn',
    description: 'AI tìm top 3 món thay thế phù hợp với tủ lạnh và ngân sách còn lại. Subscribe SSE để nhận kết quả.',
  })
  @ApiParam({ name: 'id', description: 'ID meal slot cần đổi món' })
  @ApiResponse({ status: 202, description: 'Job đã được nhận' })
  @ApiResponse({ status: 429, description: 'Vượt giới hạn AI usage' })
  async regenerateSlot(
    @CurrentUser() user: JwtPayload,
    @Param('id') slotId: string,
    @Body() dto: RegenerateSlotDto,
  ) {
    return this.mealPlanningService.regenerateSlot(user.sub, slotId, dto);
  }

  @Get('slots/:id/regenerate/:jobId/stream')
  @ApiOperation({ summary: '[AI] SSE stream kết quả regenerate slot' })
  @ApiParam({ name: 'id', description: 'ID meal slot' })
  @ApiParam({ name: 'jobId', description: 'ID job từ POST /slots/:id/regenerate' })
  @ApiResponse({ status: 200, description: 'SSE stream (text/event-stream)' })
  async streamRegenerateSlot(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const channel = `slot_regenerate:${jobId}:result`;
    const subscriber = this.redis.createSubscriber();
    await subscriber.subscribe(channel);

    const sendEvent = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { jobId });

    subscriber.on('message', (_ch: string, raw: string) => {
      try {
        const payload = JSON.parse(raw);
        sendEvent(payload.event ?? 'result', payload);
        if (payload.event === 'done' || payload.event === 'error') {
          subscriber.unsubscribe(channel).catch(() => {});
          subscriber.quit().catch(() => {});
          res.end();
        }
      } catch { /* ignore */ }
    });

    const timeout = setTimeout(() => {
      sendEvent('error', { message: 'Hết thời gian chờ' });
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
      res.end();
    }, 2 * 60 * 1000); // 2 phút

    res.on('close', () => {
      clearTimeout(timeout);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    });
  }

  // ─────────────────────────────────────────────────────────
  // Phase 10.2 — POST + SSE /plans/generate-from-expiring
  // ─────────────────────────────────────────────────────────

  @Post('plans/generate-from-expiring')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AiUsageLimitGuard)
  @AiFeature('expiring_plan')
  @ApiOperation({ summary: '[AI] Lập thực đơn từ nguyên liệu sắp hết hạn' })
  @ApiResponse({ status: 202, description: 'Job đã nhận' })
  @ApiResponse({ status: 429, description: 'Vượt giới hạn AI usage' })
  async generateFromExpiring(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateFromExpiringDto,
  ) {
    return this.mealPlanningService.generateFromExpiring(user.sub, dto);
  }

  @Get('plans/generate-from-expiring/:jobId/stream')
  @ApiOperation({ summary: '[AI] SSE stream tiến độ lập thực đơn từ đồ sắp hết hạn' })
  @ApiParam({ name: 'jobId', description: 'ID job từ POST /plans/generate-from-expiring' })
  @ApiResponse({ status: 200, description: 'SSE stream (text/event-stream)' })
  async streamExpiringMealPlan(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const channel = `expiring_meal:${jobId}:progress`;
    const subscriber = this.redis.createSubscriber();
    await subscriber.subscribe(channel);

    const sendEvent = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('connected', { jobId });

    subscriber.on('message', (_ch: string, raw: string) => {
      try {
        const payload = JSON.parse(raw);
        sendEvent(payload.event ?? 'progress', payload);
        if (payload.event === 'completed' || payload.event === 'failed') {
          subscriber.unsubscribe(channel).catch(() => {});
          subscriber.quit().catch(() => {});
          res.end();
        }
      } catch { /* ignore */ }
    });

    const timeout = setTimeout(() => {
      sendEvent('failed', { message: 'Hết thời gian chờ (3 phút)' });
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
      res.end();
    }, 3 * 60 * 1000);

    res.on('close', () => {
      clearTimeout(timeout);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    });
  }
}
