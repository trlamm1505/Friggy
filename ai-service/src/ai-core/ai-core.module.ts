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
import { SupervisorAgent } from './agents/supervisor.agent';
import { NutritionAgent } from './agents/nutrition.agent';
import { AccountantAgent } from './agents/accountant.agent';
import { ChefAgent } from './agents/chef.agent';
import { EvaluatorAgent } from './agents/evaluator.agent';

// Orchestration
import { MealPlanGraphService } from './meal-plan-graph.service';

const TOOLS  = [FridgeTools, UserTools, RecipeTools, MealPlanTools];
const AGENTS = [SupervisorAgent, NutritionAgent, AccountantAgent, ChefAgent, EvaluatorAgent];

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
    // Multi-Agent
    ...AGENTS,
    // Orchestrator
    MealPlanGraphService,
  ],
  exports: [
    AiProviderService,
    PromptService,
    RateLimitService,
    SingleAgentService,
    MealPlanGraphService,
  ],
})
export class AiCoreModule {}
