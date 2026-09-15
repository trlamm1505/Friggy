import { SetMetadata } from '@nestjs/common';

export const AI_FEATURE_KEY = 'ai_feature';

/**
 * Đánh dấu endpoint cần rate limit theo AI usage.
 * @param featureType Loại tính năng AI (meal_plan, fridge_scan, chat, ...)
 *
 * @example
 * @AiFeature('meal_plan')
 * @Post('generate')
 * async generatePlan() {}
 */
export const AiFeature = (featureType: string) =>
  SetMetadata(AI_FEATURE_KEY, featureType);
