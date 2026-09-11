import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsISO8601,
  Min,
  Max,
  MaxLength,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum GenderEnum {
  male = 'male',
  female = 'female',
  other = 'other',
}

export enum DietaryStyleEnum {
  omnivore = 'omnivore',
  vegetarian = 'vegetarian',
  vegan = 'vegan',
  keto = 'keto',
  halal = 'halal',
}

export enum SkillLevelEnum {
  beginner = 'beginner',
  intermediate = 'intermediate',
  advanced = 'advanced',
}

export enum AiPersonalityModeEnum {
  friendly = 'friendly',
  professional = 'professional',
  coach = 'coach',
}

// ─── Update Profile ───────────────────────────────────────────────────────────

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '2000-01-15', description: 'ISO 8601 date' })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GenderEnum })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @ApiPropertyOptional({ example: 'Mô tả ngắn về bản thân', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

// ─── Update Preferences ───────────────────────────────────────────────────────

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 500000, description: 'Ngân sách tuần (VND)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  weeklyBudget?: number;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(10000)
  @Type(() => Number)
  dailyCalorieTarget?: number;

  @ApiPropertyOptional({ enum: DietaryStyleEnum })
  @IsOptional()
  @IsEnum(DietaryStyleEnum)
  dietaryStyle?: DietaryStyleEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  preferSimpleRecipes?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Thời gian nấu tối đa (phút)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  @Type(() => Number)
  maxCookTimeMinutes?: number;

  @ApiPropertyOptional({ enum: SkillLevelEnum })
  @IsOptional()
  @IsEnum(SkillLevelEnum)
  skillLevel?: SkillLevelEnum;

  @ApiPropertyOptional({ example: 2, description: 'Số người trong hộ gia đình' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  householdSize?: number;

  @ApiPropertyOptional({ enum: AiPersonalityModeEnum })
  @IsOptional()
  @IsEnum(AiPersonalityModeEnum)
  aiPersonalityMode?: AiPersonalityModeEnum;

  @ApiPropertyOptional({
    example: 'save_money',
    description: 'save_money | reduce_waste | eat_healthy | convenience',
  })
  @IsOptional()
  @IsString()
  primaryGoal?: string;

  @ApiPropertyOptional({
    example: 'daily',
    description: 'daily | few_times_week | weekends | rarely',
  })
  @IsOptional()
  @IsString()
  cookingFrequency?: string;

  @ApiPropertyOptional({ example: 170, description: 'Chiều cao (cm)' })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ example: 65, description: 'Cân nặng (kg)' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(500)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({
    example: 'moderate',
    description: 'sedentary | light | moderate | active',
  })
  @IsOptional()
  @IsString()
  activityLevel?: string;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export class OnboardingDto {
  @ApiProperty({
    example: 'save_money',
    description: 'save_money | reduce_waste | eat_healthy | convenience',
  })
  @IsString()
  primaryGoal!: string;

  @ApiProperty({
    example: 'daily',
    description: 'daily | few_times_week | weekends | rarely',
  })
  @IsString()
  cookingFrequency!: string;

  @ApiPropertyOptional({ enum: DietaryStyleEnum })
  @IsOptional()
  @IsEnum(DietaryStyleEnum)
  dietaryStyle?: DietaryStyleEnum;

  @ApiPropertyOptional({ example: 170 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ example: 65 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(500)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({
    example: 'moderate',
    description: 'sedentary | light | moderate | active',
  })
  @IsOptional()
  @IsString()
  activityLevel?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  householdSize?: number;
}

// ─── Add Allergy ─────────────────────────────────────────────────────────────

export class AddAllergyDto {
  @ApiProperty({ example: 1, description: 'ID của nguyên liệu dị ứng' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  ingredientId!: number;

  @ApiPropertyOptional({ example: 'Nổi mề đay', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
