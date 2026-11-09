import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty, IsOptional, IsString, IsBoolean, IsInt, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewSupplierApplicationDto {
  @ApiPropertyOptional({ description: 'Lý do từ chối (bắt buộc khi reject)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ListSupplierApplicationsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'], description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên công ty hoặc email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class AdminSupplierApplicationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() companyName: string;
  @ApiProperty() contactName: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiPropertyOptional() address: string | null;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() website: string | null;
  @ApiProperty() status: string;
  @ApiPropertyOptional() rejectionReason: string | null;
  @ApiPropertyOptional() reviewedAt: string | null;
  @ApiPropertyOptional() reviewedBy: string | null;
  @ApiPropertyOptional() userId: string | null;
  @ApiProperty() createdAt: string;
}

