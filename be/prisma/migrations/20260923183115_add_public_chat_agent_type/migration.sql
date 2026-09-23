-- AlterTable
ALTER TABLE `ai_system_prompts` MODIFY `agentType` ENUM('supervisor', 'public_chat', 'chef_agent', 'data_agent', 'evaluator', 'nutrition_agent', 'accountant_agent') NOT NULL;

-- AlterTable
ALTER TABLE `chat_messages` MODIFY `agentType` ENUM('supervisor', 'public_chat', 'chef_agent', 'data_agent', 'evaluator', 'nutrition_agent', 'accountant_agent') NULL;
