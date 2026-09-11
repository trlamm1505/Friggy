import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { RecipesService } from './recipes.service';
import {
  ListRecipesQueryDto,
  CreateRecipeDto,
  UpdateRecipeDto,
} from './dto/recipes.dto';
import {
  RecipeSummaryDto,
  RecipeDetailDto,
  PaginatedRecipesDto,
} from './dto/recipes-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@ApiTags('Recipes')
@ApiBearerAuth('access-token')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  // ─────────────────────────────────────────────────────────
  // GET /suggestions — Gợi ý từ tủ lạnh (phải trước /:id)
  // ─────────────────────────────────────────────────────────

  @Get('suggestions')
  @ApiOperation({ summary: 'Gợi ý công thức từ nguyên liệu trong tủ lạnh (có matchScore %)' })
  @ApiResponse({ status: 200, type: [RecipeSummaryDto] })
  getSuggestions(@CurrentUser() user: JwtPayload): Promise<RecipeSummaryDto[]> {
    return this.recipesService.getSuggestions(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET /bookmarked
  // ─────────────────────────────────────────────────────────

  @Get('bookmarked')
  @ApiOperation({ summary: 'Danh sách công thức đã bookmark' })
  @ApiResponse({ status: 200, type: [RecipeSummaryDto] })
  getBookmarked(@CurrentUser() user: JwtPayload): Promise<RecipeSummaryDto[]> {
    return this.recipesService.getBookmarked(user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // GET / — Danh sách
  // ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách công thức (filter: mealType, difficulty, tag, search)' })
  @ApiResponse({ status: 200, type: PaginatedRecipesDto })
  findAll(@Query() query: ListRecipesQueryDto): Promise<PaginatedRecipesDto> {
    return this.recipesService.findAll(query);
  }

  // ─────────────────────────────────────────────────────────
  // GET /:id — Chi tiết
  // ─────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết công thức (steps + ingredients + inFridge)' })
  @ApiResponse({ status: 200, type: RecipeDetailDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<RecipeDetailDto> {
    return this.recipesService.findOne(id, user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // POST / — Tạo (Admin)
  // ─────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Tạo công thức mới (kèm ingredients + steps + tags)' })
  @ApiResponse({ status: 201, type: RecipeDetailDto })
  create(
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RecipeDetailDto> {
    return this.recipesService.create(dto, user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /:id — Cập nhật (Admin)
  // ─────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Cập nhật thông tin công thức' })
  @ApiResponse({ status: 200, type: RecipeDetailDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RecipeDetailDto> {
    return this.recipesService.update(id, dto, user.sub);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /:id — Soft delete (Admin)
  // ─────────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Xóa công thức (soft delete)' })
  @ApiResponse({ status: 204, description: 'Đã xóa' })
  remove(@Param('id') id: string): Promise<void> {
    return this.recipesService.remove(id);
  }

  // ─────────────────────────────────────────────────────────
  // POST /:id/bookmark — Bookmark
  // ─────────────────────────────────────────────────────────

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bookmark công thức' })
  @ApiResponse({ status: 204, description: 'Đã bookmark' })
  addBookmark(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.recipesService.addBookmark(user.sub, id);
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /:id/bookmark — Bỏ bookmark
  // ─────────────────────────────────────────────────────────

  @Delete(':id/bookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bỏ bookmark công thức' })
  @ApiResponse({ status: 204, description: 'Đã bỏ bookmark' })
  removeBookmark(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.recipesService.removeBookmark(user.sub, id);
  }
}
