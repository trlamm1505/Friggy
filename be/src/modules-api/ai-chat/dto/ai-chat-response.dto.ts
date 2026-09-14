/**
 * AI Chat Response DTOs
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['user', 'assistant'] }) role!: string;
  @ApiProperty() content!: string;
  @ApiPropertyOptional() tokensUsed!: number | null;
  @ApiProperty() createdAt!: string;
}

export class SessionDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() title!: string | null;
  @ApiProperty({ enum: ['active', 'closed', 'error'] }) status!: string;
  @ApiProperty() messageCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class SessionDetailDto extends SessionDto {
  @ApiProperty({ type: [MessageDto] }) messages!: MessageDto[];
}

export class SendMessageResponseDto {
  @ApiProperty() messageId!: string;
  @ApiProperty({ enum: ['pending'] }) status!: string;
  @ApiProperty({ description: 'Subscribe SSE stream: GET /ai-chat/sessions/:id/stream' })
  streamUrl!: string;
}
