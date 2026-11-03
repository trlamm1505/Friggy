import { IsString, IsNotEmpty, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'accountant',
    description: 'Tên role (chữ thường, số, gạch dưới hoặc gạch ngang)',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên role không được để trống' })
  @MaxLength(50, { message: 'Tên role không vượt quá 50 ký tự' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Tên role chỉ được chứa chữ thường (a-z), số (0-9), dấu gạch dưới (_) hoặc gạch ngang (-)',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Nhân viên kế toán — quản lý doanh thu và hóa đơn',
    description: 'Mô tả vai trò',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateRoleDescriptionDto {
  @ApiProperty({
    example: 'Quản trị viên hệ thống, toàn quyền truy cập',
    description: 'Mô tả mới cho role',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;
}
