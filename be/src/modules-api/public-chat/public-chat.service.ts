/**
 * PublicChatService — Orchestrator cho SEO Public Chatbot
 *
 * be/ chịu trách nhiệm:
 *   - Session management (Redis TTL 30 phút)
 *   - Publish job sang ai-service qua RabbitMQ
 *   - Đọc Redis Stream (XREAD) để serve SSE về FE
 *
 * ai-service chịu trách nhiệm:
 *   - Gọi AI với system prompt + history
 *   - XADD mỗi token vào Redis Stream
 *
 * Flow:
 *   POST /public-chat/messages → session check → RabbitMQ publish → { sessionId, streamKey }
 *   GET  /public-chat/stream?key=... → XREAD Redis Stream → SSE token-by-token
 *
 * Không bị race condition vì XREAD với lastId='0' đọc từ đầu stream.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RabbitMqPublisherService } from 'src/modules-system/rabbit-mq/rabbit-mq-publisher.service';
import { RedisService } from 'src/modules-system/redis/redis.service';
import { PUBLIC_CHAT_ROUTING_KEY } from 'src/common/constants/app.constant';
import { throwIfInjection } from 'src/common/utils/prompt-injection.util';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 500;
const SSE_TIMEOUT_MS = 35_000;         // Timeout tổng SSE
const XREAD_BLOCK_MS = 5_000;          // Block mỗi 5s khi không có token mới

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface ChatHistoryItem { role: 'user' | 'assistant'; content: string; }
export type { ChatHistoryItem };

export interface PublicChatResponseDto {
  sessionId: string;
  streamKey: string;
  streamUrl: string;
  isNewSession: boolean;
}

@Injectable()
export class PublicChatService {
  private readonly logger = new Logger(PublicChatService.name);

  constructor(
    private readonly rabbitMq: RabbitMqPublisherService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // GET /history?sessionId=... — Lịch sử chat của session hiện tại
  // ─────────────────────────────────────────────────────────
  async getHistory(sessionId: string): Promise<{ messages: ChatHistoryItem[]; expired: boolean }> {
    if (!sessionId) return { messages: [], expired: true };

    const exists = await this.redis.getClient().exists(this.sessionRedisKey(sessionId));
    if (!exists) return { messages: [], expired: true };

    const history = await this.loadHistory(sessionId);
    return { messages: history, expired: false };
  }

  // ─────────────────────────────────────────────────────────
  private sessionRedisKey(sessionId: string) {
    return `public_chat:session:${sessionId}`;
  }

  private async loadHistory(sessionId: string): Promise<ChatHistoryItem[]> {
    const raw = await this.redis.getClient().get(this.sessionRedisKey(sessionId));
    if (!raw) return [];
    try { return JSON.parse(raw) as ChatHistoryItem[]; } catch { return []; }
  }


  // ─────────────────────────────────────────────────────────
  // POST — Session check → publish RabbitMQ → trả streamKey
  // ─────────────────────────────────────────────────────────
  async sendMessage(message: string, sessionId?: string): Promise<PublicChatResponseDto> {
    const trimmed = message?.trim();
    if (!trimmed) throw new BadRequestException('Tin nhắn không được để trống');
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự)`);
    }

    // Layer 1: Prompt Injection Guard
    throwIfInjection(trimmed);

    // ── Session management ──
    let resolvedSessionId = sessionId;
    let isNewSession = false;

    if (resolvedSessionId) {
      const exists = await this.redis.getClient().exists(this.sessionRedisKey(resolvedSessionId));
      if (!exists) {
        resolvedSessionId = uuid();
        isNewSession = true;
        this.logger.log(`[PublicChat] Session hết hạn → tạo mới: ${resolvedSessionId}`);
      }
    } else {
      resolvedSessionId = uuid();
      isNewSession = true;
    }

    const history = await this.loadHistory(resolvedSessionId);
    const streamKey = uuid();

    // Publish job sang ai-service (history để ai-service build context)
    await this.rabbitMq.publish(PUBLIC_CHAT_ROUTING_KEY, {
      streamKey,
      message: trimmed,
      sessionId: resolvedSessionId,
      history,
    });

    this.logger.log(`[PublicChat] Published: sessionId=${resolvedSessionId} | streamKey=${streamKey}`);

    return {
      sessionId: resolvedSessionId,
      streamKey,
      streamUrl: `/api/v1/public-chat/stream?key=${streamKey}`,
      isNewSession,
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET /stream?key=... — XREAD Redis Stream → SSE
  // lastId='0' → đọc từ đầu, không bị race condition
  // ─────────────────────────────────────────────────────────
  getStream(streamKey: string): Observable<MessageEvent> {
    const redisStreamKey = `public_chat:${streamKey}:stream`;

    return new Observable((observer) => {
      this.logger.log(`[PublicChat] SSE open: streamKey=${streamKey}`);

      let lastId = '0';
      let done = false;
      const startedAt = Date.now();

      const poll = async () => {
        while (!done) {
          if (Date.now() - startedAt > SSE_TIMEOUT_MS) {
            observer.next({ data: JSON.stringify({ event: 'error', data: 'Timeout' }) } as MessageEvent);
            observer.complete();
            done = true;
            break;
          }

          try {
            const result = await this.redis.getClient().xread(
              'BLOCK', XREAD_BLOCK_MS,
              'STREAMS', redisStreamKey, lastId,
            ) as Array<[string, Array<[string, string[]]>]> | null;

            if (!result) continue;

            for (const [, entries] of result) {
              for (const [id, fields] of entries) {
                lastId = id;

                const eventIdx = fields.indexOf('event');
                const dataIdx = fields.indexOf('data');
                const event = fields[eventIdx + 1];
                const data = fields[dataIdx + 1];

                observer.next({ data: JSON.stringify({ event, data }) } as MessageEvent);

                if (event === 'done' || event === 'error') {
                  observer.complete();
                  done = true;
                  break;
                }
              }
              if (done) break;
            }
          } catch (err: any) {
            this.logger.error(`[PublicChat] XREAD error: ${err?.message}`);
            observer.error(err);
            done = true;
          }
        }
      };

      poll();

      return () => {
        this.logger.log(`[PublicChat] SSE closed: streamKey=${streamKey}`);
        done = true;
      };
    });
  }

}
