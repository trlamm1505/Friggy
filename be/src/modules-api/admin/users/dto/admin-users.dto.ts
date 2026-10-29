import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên / email', example: 'Nguyen' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'pending'], example: 'active' })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending'])
  status?: string;

  @ApiPropertyOptional({ description: 'Trang', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi / trang', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Email đăng nhập', example: 'manager@friggy.app' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @ApiProperty({ description: 'Mật khẩu khởi tạo (tối thiểu 6 ký tự)', example: 'Password123@' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({ description: 'Họ tên người dùng', example: 'Quản lý kho' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Vai trò chỉ định',
    enum: ['admin', 'manager', 'user'],
    example: 'manager',
  })
  @IsEnum(['admin', 'manager', 'user'], { message: 'Role phải là admin, manager hoặc user' })
  @IsNotEmpty({ message: 'Role không được để trống' })
  role!: 'admin' | 'manager' | 'user';

  @ApiPropertyOptional({
    description: 'Trạng thái tài khoản',
    enum: ['active', 'suspended'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended'], { message: 'Trạng thái phải là active hoặc suspended' })
  status?: 'active' | 'suspended';
}


export class UpdateAdminUserDto {
  @ApiPropertyOptional({ description: 'Họ tên người dùng', example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Vai trò người dùng',
    enum: ['admin', 'manager', 'user'],
    example: 'manager',
  })
  @IsOptional()
  @IsEnum(['admin', 'manager', 'user'], { message: 'Role phải là admin, manager hoặc user' })
  role?: 'admin' | 'manager' | 'user';

  @ApiPropertyOptional({
    description: 'Trạng thái tài khoản',
    enum: ['active', 'suspended'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended'], { message: 'Trạng thái phải là active hoặc suspended' })
  status?: 'active' | 'suspended';
}
