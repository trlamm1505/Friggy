/**
 * AiChatController — API endpoints cho AI Chat
 *
 * Tất cả endpoints yêu cầu JWT auth.
 * SSE stream dùng @Sse() decorator với Observable<MessageEvent>.
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Sse,
  MessageEvent,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { AiChatService } from './ai-chat.service';
import { CreateSessionDto, SendMessageDto, ListSessionsQueryDto } from './dto/ai-chat.dto';
import {
  SessionDto,
  SessionDetailDto,
  SendMessageResponseDto,
} from './dto/ai-chat-response.dto';

@ApiTags('AI Chat')
@ApiBearerAuth('access-token')
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  // ─────────────────────────────────────────────────────────
  // GET /sessions — Danh sách phiên chat
  // ─────────────────────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: 'Danh sách phiên chat (pagination)' })
  @ApiResponse({ status: 200, type: [SessionDto] })
  getSessions(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSessionsQueryDto,
  ): Promise<SessionDto[]> {
    return this.aiChatService.getSessions(user.sub, query);
  }

  // ─────────────────────────────────────────────────────────
  // POST /sessions — Tạo phiên chat mới
  // ─────────────────────────────────────────────────────────

  @Post('sessions')
  @ApiOperation({ summary: 'Tạo phiên chat mới' })
  @ApiResponse({ status: 201, type: SessionDto })
  createSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionDto> {
    return this.aiChatService.createSession(user.sub, dto);
  }

  // ─────────────────────────────────────────────────────────
  // GET /sessions/:id — Chi tiết + lịch sử
  // ─────────────────────────────────────────────────────────

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Chi tiết phiên chat + 50 messages gần nhất' })
  @ApiResponse({ status: 200, type: SessionDetailDto })
  getSessionDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SessionDetailDto> {
    return this.aiChatService.getSessionDetail(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /sessions/:id — Soft delete
  // ─────────────────────────────────────────────────────────

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đóng / xóa phiên chat' })
  @ApiResponse({ status: 204 })
  deleteSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.aiChatService.deleteSession(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // POST /sessions/:id/messages — Gửi tin nhắn
  // ─────────────────────────────────────────────────────────

  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Gửi tin nhắn → AI xử lý async. FE mở SSE stream để nhận response.',
  })
  @ApiResponse({ status: 202, type: SendMessageResponseDto })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    return this.aiChatService.sendMessage(user.sub, id, dto);
  }

  // ─────────────────────────────────────────────────────────
  // GET /sessions/:id/stream — SSE stream AI response
  // ─────────────────────────────────────────────────────────

  @Sse('sessions/:id/stream')
  @ApiOperation({
    summary: 'SSE stream — nhận AI response theo từng token. Giữ kết nối đến khi nhận event "done".',
  })
  streamSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Observable<MessageEvent> {
    return this.aiChatService.streamSession(user.sub, id);
  }
}
