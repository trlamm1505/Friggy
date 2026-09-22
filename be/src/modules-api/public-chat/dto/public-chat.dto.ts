import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO cho POST /public-chat/messages — hỗ trợ sessionId để tiếp tục hội thoại cũ */
export class PublicChatMessageDto {
  @ApiProperty({
    example: 'Tủ lạnh tôi có cà chua và trứng, nấu gì được?',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-...',
    description:
      'sessionId từ lần chat trước (lưu trong localStorage). Bỏ trống = tạo session mới.',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
