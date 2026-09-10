import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserPreferenceResponseDto {
  @ApiProperty() weeklyBudget!: number | null;
  @ApiProperty() dailyCalorieTarget!: number | null;
  @ApiProperty() dietaryStyle!: string | null;
  @ApiProperty() preferSimpleRecipes!: boolean;
  @ApiProperty() maxCookTimeMinutes!: number | null;
  @ApiProperty() skillLevel!: string;
  @ApiProperty() householdSize!: number;
  @ApiProperty() aiPersonalityMode!: string;
  @ApiProperty() primaryGoal!: string | null;
  @ApiProperty() cookingFrequency!: string | null;
  @ApiProperty() height!: number | null;
  @ApiProperty() weight!: number | null;
  @ApiProperty() activityLevel!: string | null;
}

export class UserProfileResponseDto {
  @ApiPropertyOptional() displayName!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
  @ApiPropertyOptional() dateOfBirth!: string | null;
  @ApiPropertyOptional() gender!: string | null;
  @ApiPropertyOptional() bio!: string | null;
}

export class AllergyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ingredientId!: number;
  @ApiProperty() ingredientName!: string;
  @ApiPropertyOptional() note!: string | null;
}

export class MeResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() name!: string | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() googleEmail!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() role!: string;
  @ApiProperty() isOnboardingCompleted!: boolean;
  @ApiPropertyOptional({ type: UserProfileResponseDto }) profile!: UserProfileResponseDto | null;
  @ApiPropertyOptional({ type: UserPreferenceResponseDto }) preferences!: UserPreferenceResponseDto | null;
}

export class AiUsageResponseDto {
  @ApiProperty({ example: 3, description: 'Số lượt AI đã dùng trong tuần' }) used!: number;
  @ApiProperty({ example: 10, description: 'Giới hạn lượt / tuần (Free plan)' }) limit!: number;
  @ApiProperty({ example: 7, description: 'Số lượt còn lại' }) remaining!: number;
  @ApiProperty({ example: 'free', description: 'Gói hiện tại' }) plan!: string;
}
