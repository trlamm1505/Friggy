import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUrl,
  Matches,
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

  @ApiProperty({
    example: '0101234567',
    description: 'Mã số thuế doanh nghiệp (10 chữ số hoặc 10 chữ số kèm mã chi nhánh -xxx)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã số thuế doanh nghiệp không được để trống' })
  @MaxLength(20)
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Mã số thuế không hợp lệ (gồm 10 chữ số hoặc định dạng 10-3 chữ số, VD: 0101234567 hoặc 0101234567-001)',
  })
  taxCode!: string;

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
  @ApiPropertyOptional() taxCode!: string | null;
  @ApiProperty() contactName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() address!: string | null;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() website!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}
