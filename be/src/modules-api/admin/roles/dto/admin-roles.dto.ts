import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'moderator',
    description: 'Tên mới cho role (chữ thường, số, gạch dưới hoặc gạch ngang)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên role không được để trống nếu có truyền' })
  @MaxLength(50, { message: 'Tên role không vượt quá 50 ký tự' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Tên role chỉ được chứa chữ thường (a-z), số (0-9), dấu gạch dưới (_) hoặc gạch ngang (-)',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Quản trị viên hệ thống, toàn quyền truy cập',
    description: 'Mô tả vai trò',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

