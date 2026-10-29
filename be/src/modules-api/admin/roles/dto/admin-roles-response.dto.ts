import { ApiProperty } from '@nestjs/swagger';

export class RoleItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'admin', enum: ['admin', 'manager', 'user'] })
  name!: string;

  @ApiProperty({ example: 'Quản trị viên hệ thống', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 3, description: 'Số lượng user đang có role này' })
  userCount!: number;

  @ApiProperty()
  createdAt!: Date;
}
