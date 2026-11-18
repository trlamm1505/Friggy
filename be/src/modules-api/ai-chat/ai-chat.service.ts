/**
 * AiChatService — Business logic cho AI Chat module
 *
 * Xử lý CRUD chat sessions + messages, publish jobs lên RabbitMQ,
 * và subscribe Redis để stream SSE về FE.
 *
 * Prompt injection guard: throwIfInjection() được gọi tại sendMessage()
 * trước khi publish message lên RabbitMQ.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/modules-system/prisma/prisma.service';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { AI_CHAT_ROUTING_KEY } from 'src/common/constants/app.constant';
import { v4 as uuid } from 'uuid';
import { Observable } from 'rxjs';
import type {
  CreateSessionDto,
  SendMessageDto,
  ListSessionsQueryDto,
} from './dto/ai-chat.dto';
import type {
  SessionDto,
  SessionDetailDto,
  SendMessageResponseDto,
} from './dto/ai-chat-response.dto';
import { throwIfInjection } from 'src/common/utils/prompt-injection.util';

const AI_CHAT_MAX_LENGTH = 2000;
const AI_CHAT_HISTORY_LIMIT = 10;

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMq: RabbitMqPublisherService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GET /sessions — Danh sách phiên chat
  // ─────────────────────────────────────────────────────────

  async getSessions(userId: string, query: ListSessionsQueryDto): Promise<SessionDto[]> {
    const { page = 1, limit = 20 } = query;
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { messages: true } } },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title ?? null,
      status: s.status,
      messageCount: s._count.messages,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  // ─────────────────────────────────────────────────────────
  // POST /sessions — Tạo phiên chat mới
  // ─────────────────────────────────────────────────────────

  async createSession(userId: string, dto: CreateSessionDto): Promise<SessionDto> {
    const session = await this.prisma.chatSession.create({
      data: {
        userId,
        title: dto.title ?? null,
        status: 'active',
      },
      include: { _count: { select: { messages: true } } },
    });

    return {
      id: session.id,
      title: session.title ?? null,
      status: session.status,
      messageCount: 0,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /sessions/:id — Chi tiết + lịch sử messages
  // ─────────────────────────────────────────────────────────

  async getSessionDetail(
    userId: string,
    sessionId: string,
    page = 1,
    limit = 50,
  ): Promise<SessionDetailDto> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        },
        _count: { select: { messages: true } },
      },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat');

    return {
      id: session.id,
      title: session.title ?? null,
      status: session.status,
      messageCount: session._count.messages,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        tokensUsed: m.tokensUsed ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /sessions/:id — Soft delete
  // ─────────────────────────────────────────────────────────

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat');

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { deletedAt: new Date(), status: 'closed' },
    });
  }

  // ─────────────────────────────────────────────────────────
  // POST /sessions/:id/messages — Gửi tin nhắn → AI
  // ─────────────────────────────────────────────────────────

  async sendMessage(
    userId: string,
    sessionId: string,
    dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    // Validate session ownership
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null, status: 'active' },
    });
    if (!session) throw new NotFoundException('Phiên chat không tồn tại hoặc đã đóng');

    // ── Layer 1: Prompt Injection Guard ──
    throwIfInjection(dto.content);

    const sanitized = dto.content.trim().slice(0, AI_CHAT_MAX_LENGTH);

    // Lấy history TRƯỚC khi lưu message hiện tại — tránh duplicate
    // (SingleAgentService sẽ append message hiện tại vào cuối riêng)
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: AI_CHAT_HISTORY_LIMIT,
    });

    // Lưu user message vào DB (sau khi fetch history)
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: sanitized,
      },
    });

    // Publish job sang ai-service
    await this.rabbitMq.publish(AI_CHAT_ROUTING_KEY, {
      sessionId,
      messageId: userMessage.id,
      userId,
      userMessage: sanitized,
      history: history
        .reverse() // oldest → newest
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    this.logger.log(`[AiChat] Published: sessionId=${sessionId} | msgId=${userMessage.id}`);

    return {
      messageId: userMessage.id,
      status: 'pending',
      streamUrl: `/api/v1/ai-chat/sessions/${sessionId}/stream`,
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /sessions/:id/stream — SSE stream từ Redis
  // ─────────────────────────────────────────────────────────

  streamSession(userId: string, sessionId: string): Observable<MessageEvent> {
    const channel = `chat:${sessionId}:stream`;

    return new Observable((observer) => {
      this.logger.log(`[AiChat] SSE open: sessionId=${sessionId} userId=${userId}`);

      // Tạo subscriber riêng (Redis không dùng chung client pub/sub)
      const subscriber = this.redis.createSubscriber();
      subscriber.subscribe(channel);

      subscriber.on('message', (_ch: string, message: string) => {
        try {
          const event = JSON.parse(message);
          observer.next({ data: JSON.stringify(event) } as MessageEvent);

          if (event.event === 'done' || event.event === 'error') {
            subscriber.disconnect();
            observer.complete();
          }
        } catch { /* ignore parse errors */ }
      });

      // Cleanup khi FE disconnect
      return () => {
        this.logger.log(`[AiChat] SSE closed: sessionId=${sessionId}`);
        subscriber.disconnect();
      };
    });
  }
}
