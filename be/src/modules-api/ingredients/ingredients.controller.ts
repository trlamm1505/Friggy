import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import {
  ListIngredientsQueryDto,
  CreateIngredientDto,
  UpdateIngredientDto,
} from './dto/ingredients.dto';
import {
  IngredientResponseDto,
  PaginatedIngredientsDto,
  CategoryResponseDto,
  PurchaseLinkResponseDto,
} from './dto/ingredients-response.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Ingredients')
@ApiBearerAuth('access-token')
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  // ─────────────────────────────────────────────────────────
  // GET /categories — Cây danh mục (public data, chỉ cần JWT)
  // ─────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Lấy cây danh mục nguyên liệu (có children)' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  getCategories(): Promise<CategoryResponseDto[]> {
    return this.ingredientsService.getCategories();
  }

  // ─────────────────────────────────────────────────────────
  // GET / — Danh sách có pagination
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách nguyên liệu (pagination + search + categoryId)' })
  @ApiResponse({ status: 200, type: PaginatedIngredientsDto })
  findAll(@Query() query: ListIngredientsQueryDto): Promise<PaginatedIngredientsDto> {
    return this.ingredientsService.findAll(query);
  }

  // ─────────────────────────────────────────────────────────
  // GET /:id — Chi tiết
  // ─────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nguyên liệu' })
  @ApiResponse({ status: 200, type: IngredientResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<IngredientResponseDto> {
    return this.ingredientsService.findOne(id);
  }

  // ─────────────────────────────────────────────────────────
  // GET /:id/purchase-links — Link mua TMDT
  // ─────────────────────────────────────────────────────────

  @Get(':id/purchase-links')
  @ApiOperation({ summary: 'Link mua nguyên liệu trên TMDT (Shopee, Lazada...)' })
  @ApiResponse({ status: 200, type: [PurchaseLinkResponseDto] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nguyên liệu' })
  getPurchaseLinks(@Param('id', ParseIntPipe) id: number): Promise<PurchaseLinkResponseDto[]> {
    return this.ingredientsService.getPurchaseLinks(id);
  }

  // ─────────────────────────────────────────────────────────
  // POST / — Tạo nguyên liệu (Admin only)
  // ─────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Tạo nguyên liệu mới' })
  @ApiResponse({ status: 201, type: IngredientResponseDto })
  @ApiResponse({ status: 409, description: 'Tên đã tồn tại' })
  create(@Body() dto: CreateIngredientDto): Promise<IngredientResponseDto> {
    return this.ingredientsService.create(dto);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /:id — Cập nhật (Admin only)
  // ─────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Cập nhật nguyên liệu' })
  @ApiResponse({ status: 200, type: IngredientResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientDto,
  ): Promise<IngredientResponseDto> {
    return this.ingredientsService.update(id, dto);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /:id — Soft delete (Admin only)
  // ─────────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Xóa nguyên liệu (soft delete)' })
  @ApiResponse({ status: 204, description: 'Đã xóa' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ingredientsService.remove(id);
  }
}
