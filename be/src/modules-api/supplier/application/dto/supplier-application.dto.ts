import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class CreateSupplierApplicationDto {
  @ApiProperty({
    example: 'Công ty TNHH ABC Farm',
    description: 'Tên công ty / thương hiệu',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người đại diện' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName!: string;

  @ApiProperty({
    example: 'contact@abcfarm.vn',
    description:
      'Email liên hệ — sẽ dùng làm tài khoản đăng nhập khi được duyệt',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Lê Lợi, Q1, TP.HCM' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: 'Nhà cung cấp thực phẩm sạch tươi mỗi ngày, chứng nhận VietGAP',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://abcfarm.vn',
    description: 'Website của đối tác (nếu có)',
  })
  @IsOptional()
  @IsUrl({}, { message: 'website phải là URL hợp lệ (vd: https://abcfarm.vn)' })
  @MaxLength(255)
  website?: string;
}

export class SupplierApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty() contactName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() address!: string | null;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() website!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}
