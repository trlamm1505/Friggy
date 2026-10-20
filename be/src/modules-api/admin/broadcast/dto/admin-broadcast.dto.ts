import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Thông báo bảo trì hệ thống', description: 'Tiêu đề thông báo' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Friggy sẽ bảo trì vào 22:00 tối nay.',
    description: 'Nội dung thông báo',
  })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({
    example: 'all',
    description: 'Nhóm mục tiêu: all | free_users | paid_users',
    enum: ['all', 'free_users', 'paid_users'],
    default: 'all',
  })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'free_users', 'paid_users'])
  targetGroup?: 'all' | 'free_users' | 'paid_users' = 'all';
}
