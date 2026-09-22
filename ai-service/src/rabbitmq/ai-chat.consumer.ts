/**
 * AiChatConsumer — RabbitMQ Consumer cho AI Chat jobs
 *
 * Nhận job từ Main BE khi user gửi tin nhắn chat.
 * Pipeline: SingleAgentService → stream tokens → Redis PUBLISH → BE SSE → FE
 *
 * Prompt injection guard đã được tích hợp trong SingleAgentService.
 */
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import {
  FRIGGY_AI_EXCHANGE,
  AI_CHAT_ROUTING_KEY,
  AI_CHAT_QUEUE_NAME,
} from 'src/common/constant/app.constant';
import { SingleAgentService } from 'src/ai-core/single-agent.service';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AiChatJob {
  sessionId: string;
  messageId: string;   // ID của user message trong DB
  userId: string;
  userMessage: string; // Nội dung đã sanitize từ BE
  history: {
    role: 'user' | 'assistant';
    content: string;
  }[];
}

@Injectable()
export class AiChatConsumer {
  private readonly logger = new Logger(AiChatConsumer.name);

  constructor(
    private readonly singleAgent: SingleAgentService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @RabbitSubscribe({
    exchange: FRIGGY_AI_EXCHANGE,
    routingKey: AI_CHAT_ROUTING_KEY,
    queue: AI_CHAT_QUEUE_NAME,
    queueOptions: { durable: true },
  })
  async handleAiChat(job: AiChatJob): Promise<void | Nack> {
    const { sessionId, messageId, userId, userMessage, history } = job;
    const redisChannel = `chat:${sessionId}:stream`;

    this.logger.log(
      `💬 [AiChatConsumer] Nhận job: sessionId=${sessionId} | userId=${userId}`,
    );

    let fullResponse = '';
    let tokensUsed = 0;

    try {
      // Chạy SingleAgent — SSE events được forward qua Redis
      const stream$ = this.singleAgent.run({
        userId,
        featureType: 'chat',
        message: userMessage,
        history,
      });

      await new Promise<void>((resolve, reject) => {
        stream$.subscribe({
          next: async (event) => {
            // Forward mọi event qua Redis → BE SSE → FE
            await this.redis.publish(redisChannel, JSON.stringify(event));

            if (event.event === 'chunk') {
              fullResponse += event.data;
            }
            if (event.event === 'done') {
              try {
                tokensUsed = JSON.parse(event.data).tokensUsed ?? 0;
              } catch { /* ignore */ }
            }
          },
          error: reject,
          complete: resolve,
        });
      });

      // Lưu AI response vào DB (chat_messages)
      await this.prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant' as any,
          content: fullResponse,
          tokensUsed,
        },
      });

      // Ghi log AI usage (fix bug: guard chỉ check nhưng không INSERT)
      await this.prisma.aiUsageLog.create({
        data: { userId, featureType: 'chat', usedAt: new Date() },
      });

      this.logger.log(
        `[AiChatConsumer] Hoàn thành: sessionId=${sessionId} | tokens=${tokensUsed}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ [AiChatConsumer] Lỗi: sessionId=${sessionId} | ${error?.message}`,
      );

      // Publish error event để FE biết
      await this.redis.publish(
        redisChannel,
        JSON.stringify({ event: 'error', data: 'Đã xảy ra lỗi khi xử lý tin nhắn' }),
      ).catch(() => {});

      return new Nack(false); // Không requeue tránh loop
    }
  }
}
