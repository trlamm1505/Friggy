/**
 * PublicChatController — Public SEO AI Chatbot
 *
 * Giống AI Chat JWT — 2 endpoints:
 *   POST /public-chat/messages      → gửi tin nhắn, nhận streamKey
 *   GET  /public-chat/stream?key=.. → SSE stream token-by-token
 *
 * Không cần JWT. Rate limit: 10 tin / IP / ngày.
 * Session lưu trong Redis TTL 30 phút — hết hạn → session mới tự động.
 */
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Public } from 'src/common/decorators/public.decorator';
import { WebChatRateLimitGuard } from 'src/common/guards/web-chat-rate-limit.guard';
import { PublicChatService } from './public-chat.service';
import { PublicChatMessageDto } from './dto/public-chat.dto';

@ApiTags('AI Public Chat')
@Controller('public-chat')
export class PublicChatController {
  constructor(private readonly publicChatService: PublicChatService) {}

  // ─────────────────────────────────────────────────────────
  // POST /public-chat/messages — Gửi tin nhắn → nhận streamKey
  // ─────────────────────────────────────────────────────────

  @Post('messages')
  @Public()
  @UseGuards(WebChatRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Public] Gửi tin nhắn chatbot — nhận streamKey để mở SSE stream' })
  @ApiBody({ type: PublicChatMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Job accepted — mở SSE tại streamUrl',
    schema: {
      example: {
        sessionId: 'uuid-session',
        streamKey: 'uuid-stream',
        streamUrl: '/api/v1/public-chat/stream?key=uuid-stream',
        isNewSession: true,
      },
    },
  })
  @ApiResponse({ status: 429, description: 'Vượt 10 tin nhắn / ngày' })
  async sendMessage(@Body() dto: PublicChatMessageDto) {
    return this.publicChatService.sendMessage(dto.message, dto.sessionId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /public-chat/history?sessionId=... — Lịch sử chat (load lại khi F5)
  // ─────────────────────────────────────────────────────────

  @Get('history')
  @Public()
  @ApiOperation({ summary: '[Public] Lấy lịch sử chat theo sessionId — dùng khi load lại trang' })
  @ApiQuery({ name: 'sessionId', required: true, description: 'sessionId lưu trong localStorage' })
  @ApiResponse({
    status: 200,
    description: 'messages: array lịch sử | expired: true nếu session hết hạn (30 phút)',
    schema: { example: { messages: [{ role: 'user', content: 'Cà chua nấu gì?' }, { role: 'assistant', content: 'Bạn có thể...' }], expired: false } },
  })
  async getChatHistory(@Query('sessionId') sessionId: string) {
    return this.publicChatService.getHistory(sessionId);
  }

  // ─────────────────────────────────────────────────────────
  // GET /public-chat/stream?key=... — SSE stream
  // ─────────────────────────────────────────────────────────

  @Sse('stream')
  @Public()
  @ApiOperation({ summary: '[Public] SSE stream AI response — nhận từng token đến khi có event "done"' })
  @ApiQuery({ name: 'key', description: 'streamKey từ POST /public-chat/messages', required: true })
  @ApiResponse({ status: 200, description: 'SSE stream token-by-token' })
  @ApiResponse({ status: 404, description: 'streamKey không tồn tại hoặc đã hết hạn (5 phút)' })
  getStream(@Query('key') key: string): Observable<MessageEvent> {
    return this.publicChatService.getStream(key);
  }
}
