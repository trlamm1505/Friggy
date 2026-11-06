import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseInterceptors,
  UploadedFile, Res, HttpCode, HttpStatus,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiParam, ApiResponse, ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SupplierActiveGuard } from 'src/common/guards/supplier-active.guard';
import { multerExcelConfig } from 'src/common/configs/multer.config';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { SupplierIngredientsService } from './supplier-ingredients.service';
import {
  CreateSupplierIngredientDto,
  UpdateSupplierIngredientDto,
  ListSupplierIngredientsQueryDto,
} from './dto/supplier-ingredient.dto';
import type {
  SupplierIngredientResponseDto,
  PaginatedSupplierIngredientsDto,
  ImportResultDto,
} from './dto/supplier-ingredient-response.dto';

@ApiTags('Supplier / Ingredients')
@ApiBearerAuth('access-token')
@Roles('food_supplier')
@Controller('supplier/ingredients')
export class SupplierIngredientsController {
  constructor(private readonly service: SupplierIngredientsService) {}

  @Get('template')
  @ApiOperation({ summary: '[Supplier] Tải file Excel mẫu để import nguyên liệu' })
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.service.getTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="supplier_ingredients_template.xlsx"');
    res.send(buffer);
  }

  @Get()
  @ApiOperation({ summary: '[Supplier] Danh sách nguyên liệu của mình' })
  @ApiResponse({ status: 200, type: Object })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSupplierIngredientsQueryDto,
  ): Promise<PaginatedSupplierIngredientsDto> {
    return this.service.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Supplier] Chi tiết 1 nguyên liệu' })
  @ApiParam({ name: 'id' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SupplierIngredientResponseDto> {
    return this.service.findOne(user.sub, id);
  }

  @Post()
  @UseGuards(SupplierActiveGuard)
  @ApiOperation({ summary: '[Supplier] Thêm 1 nguyên liệu → trạng thái pending chờ duyệt' })
  @ApiResponse({ status: 201, type: Object })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupplierIngredientDto,
  ): Promise<SupplierIngredientResponseDto> {
    return this.service.create(user.sub, dto);
  }

  @Post('import')
  @UseGuards(SupplierActiveGuard)
  @ApiOperation({ summary: '[Supplier] Import hàng loạt nguyên liệu từ file Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, type: Object })
  @UseInterceptors(FileInterceptor('file', multerExcelConfig))
  async importExcel(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResultDto> {
    if (!file) throw new BadRequestException('Chưa chọn file Excel');
    return this.service.importExcel(user.sub, file);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Supplier] Cập nhật nguyên liệu (chỉ khi pending hoặc rejected)' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierIngredientDto,
  ): Promise<SupplierIngredientResponseDto> {
    return this.service.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Supplier] Xóa nguyên liệu (soft delete)' })
  @ApiParam({ name: 'id' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(user.sub, id);
  }
}

