/**
 * AiCoreModule — Module trung tâm của AI Service
 *
 * Chứa toàn bộ logic AI của Friggy:
 * - Infrastructure: AiProviderService, PromptService, RateLimitService
 * - Tools (16 công cụ): FridgeTools, UserTools, RecipeTools, MealPlanTools
 * - Specialized Agents: Supervisor, Nutrition, Accountant, Chef, Evaluator
 * - Orchestration: MealPlanGraphService (Multi-Agent Pipeline)
 * - Single Agent: SingleAgentService (AI Chat, Phase 9)
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';

// AI Infrastructure
import { AiProviderService } from './ai-provider.service';
import { PromptService } from './prompt.service';
import { RateLimitService } from './rate-limit.service';
import { SingleAgentService } from './single-agent.service';

// Tools
import { FridgeTools } from './tools/fridge.tools';
import { UserTools } from './tools/user.tools';
import { RecipeTools } from './tools/recipe.tools';
import { MealPlanTools } from './tools/meal-plan.tools';

// Specialized Agents (Multi-Agent System)
import { SupervisorAgent } from './agents/meal-plan/supervisor.agent';
import { NutritionAgent } from './agents/meal-plan/nutrition.agent';
import { AccountantAgent } from './agents/meal-plan/accountant.agent';
import { ChefAgent } from './agents/meal-plan/chef.agent';
import { EvaluatorAgent } from './agents/meal-plan/evaluator.agent';

// Orchestration
import { MealPlanGraphService } from './meal-plan-graph.service';
import { FridgeScanGraphService } from './fridge-scan-graph.service';

// Fridge Scan Agents
import { VisionAgent } from './agents/fridge-scan/vision.agent';
import { NormalizerAgent } from './agents/fridge-scan/normalizer.agent';
import { ValidatorAgent } from './agents/fridge-scan/validator.agent';

const TOOLS = [FridgeTools, UserTools, RecipeTools, MealPlanTools];
const AGENTS = [
  SupervisorAgent,
  NutritionAgent,
  AccountantAgent,
  ChefAgent,
  EvaluatorAgent,
];
const SCAN_AGENTS = [VisionAgent, NormalizerAgent, ValidatorAgent];

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    // Infrastructure
    AiProviderService,
    PromptService,
    RateLimitService,
    SingleAgentService,
    // Tools
    ...TOOLS,
    // Multi-Agent (Meal Plan)
    ...AGENTS,
    // Multi-Agent (Fridge Scan)
    ...SCAN_AGENTS,
    // Orchestrators
    MealPlanGraphService,
    FridgeScanGraphService,
  ],
  exports: [
    AiProviderService,
    PromptService,
    RateLimitService,
    SingleAgentService,
    MealPlanGraphService,
    FridgeScanGraphService,
  ],
})
export class AiCoreModule {}
