import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetSupplierPasswordDto {
  @ApiProperty({ description: 'Token nhận được qua email', example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Mật khẩu mới (ít nhất 8 ký tự)', example: 'MyStr0ng@Pass' })
  @IsString()
  @MinLength(8)
  password: string;
}

