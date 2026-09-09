-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('admin', 'user') NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `phone` VARCHAR(15) NULL,
    `googleId` VARCHAR(255) NULL,
    `googleEmail` VARCHAR(255) NULL,
    `authProvider` ENUM('google', 'phone') NOT NULL,
    `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
    `roleId` INTEGER NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_phone_key`(`phone`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_verifications` (
    `id` CHAR(36) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `otpHash` VARCHAR(255) NOT NULL,
    `purpose` ENUM('login', 'register', 'change_phone') NOT NULL,
    `attempts` TINYINT NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_verifications_phone_purpose_expiresAt_idx`(`phone`, `purpose`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `avatarPath` VARCHAR(512) NULL,
    `dateOfBirth` DATE NULL,
    `gender` ENUM('male', 'female', 'other') NULL,
    `bio` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `user_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `weeklyBudget` INTEGER NULL,
    `dailyCalorieTarget` INTEGER NULL,
    `dietaryStyle` ENUM('omnivore', 'vegetarian', 'vegan', 'keto', 'halal') NULL,
    `preferSimpleRecipes` BOOLEAN NOT NULL DEFAULT true,
    `maxCookTimeMinutes` INTEGER NULL,
    `skillLevel` ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
    `householdSize` TINYINT NOT NULL DEFAULT 1,
    `aiPersonalityMode` ENUM('friendly', 'professional', 'chef') NOT NULL DEFAULT 'friendly',
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `user_preferences_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(512) NOT NULL,
    `deviceInfo` VARCHAR(255) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `refresh_tokens_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `iconPath` VARCHAR(255) NULL,
    `parentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ingredient_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `defaultUnit` VARCHAR(30) NOT NULL,
    `caloriesPer100g` DOUBLE NULL,
    `averagePricePerUnit` INTEGER NULL,
    `imagePath` VARCHAR(512) NULL,
    `isCommon` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ingredients_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `type` ENUM('cuisine', 'dietary', 'technique', 'occasion') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipes` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `thumbnailPath` VARCHAR(512) NULL,
    `mealType` ENUM('breakfast', 'lunch', 'dinner', 'snack', 'dessert') NOT NULL,
    `cookTimeMinutes` INTEGER NOT NULL,
    `servings` TINYINT NOT NULL,
    `difficultyLevel` ENUM('easy', 'medium', 'hard') NOT NULL,
    `estimatedCost` INTEGER NULL,
    `isAiGenerated` BOOLEAN NOT NULL DEFAULT false,
    `authorId` CHAR(36) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    FULLTEXT INDEX `recipes_title_description_idx`(`title`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_ingredients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipeId` CHAR(36) NOT NULL,
    `ingredientId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(255) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipeId` CHAR(36) NOT NULL,
    `stepNumber` TINYINT NOT NULL,
    `instruction` TEXT NOT NULL,
    `imagePath` VARCHAR(512) NULL,
    `durationMinutes` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipe_tags` (
    `recipeId` CHAR(36) NOT NULL,
    `tagId` INTEGER NOT NULL,

    PRIMARY KEY (`recipeId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_saved_recipes` (
    `userId` CHAR(36) NOT NULL,
    `recipeId` CHAR(36) NOT NULL,
    `savedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`userId`, `recipeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fridge_items` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `ingredientId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `purchasedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `storageLocation` ENUM('fridge', 'freezer', 'pantry') NOT NULL DEFAULT 'fridge',
    `addedBy` ENUM('manual', 'ai_scan') NOT NULL DEFAULT 'manual',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `fridge_items_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_scan_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `imagePath` VARCHAR(512) NOT NULL,
    `aiRawResponse` JSON NOT NULL,
    `detectedItems` JSON NOT NULL,
    `confirmedItems` JSON NULL,
    `processingStatus` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    `errorMessage` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_allergies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `ingredientId` INTEGER NOT NULL,
    `severityLevel` ENUM('mild', 'moderate', 'severe') NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `user_allergies_userId_ingredientId_key`(`userId`, `ingredientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weekly_plans` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `weekStartDate` DATE NOT NULL,
    `totalBudget` INTEGER NOT NULL,
    `actualCost` INTEGER NULL,
    `status` ENUM('draft', 'confirmed', 'active', 'completed') NOT NULL DEFAULT 'draft',
    `generatedByAi` BOOLEAN NOT NULL DEFAULT true,
    `aiSessionId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `weekly_plans_userId_weekStartDate_idx`(`userId`, `weekStartDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_plans` (
    `id` CHAR(36) NOT NULL,
    `weeklyPlanId` CHAR(36) NOT NULL,
    `dayOfWeek` TINYINT NOT NULL,
    `date` DATE NOT NULL,
    `dailyBudget` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meal_slots` (
    `id` CHAR(36) NOT NULL,
    `dailyPlanId` CHAR(36) NOT NULL,
    `mealType` ENUM('breakfast', 'lunch', 'dinner', 'snack', 'dessert') NOT NULL,
    `recipeId` CHAR(36) NULL,
    `servings` TINYINT NOT NULL DEFAULT 1,
    `estimatedCost` INTEGER NULL,
    `note` VARCHAR(255) NULL,
    `completedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopping_lists` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `weeklyPlanId` CHAR(36) NULL,
    `title` VARCHAR(150) NOT NULL,
    `status` ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'draft',
    `totalEstimatedCost` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopping_list_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shoppingListId` CHAR(36) NOT NULL,
    `ingredientId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `estimatedPrice` INTEGER NULL,
    `isPurchased` BOOLEAN NOT NULL DEFAULT false,
    `purchasedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_system_prompts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agentType` ENUM('supervisor', 'chef_agent', 'data_agent', 'evaluator') NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `promptContent` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `activatedAt` DATETIME(3) NULL,
    `activatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ai_system_prompts_agentType_version_key`(`agentType`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_sessions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `title` VARCHAR(255) NULL,
    `intent` ENUM('general_qa', 'meal_planning', 'recipe_request', 'scan_followup', 'other') NULL,
    `status` ENUM('active', 'closed', 'error') NOT NULL DEFAULT 'active',
    `totalTokensUsed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` CHAR(36) NOT NULL,
    `sessionId` CHAR(36) NOT NULL,
    `role` ENUM('user', 'assistant', 'system', 'tool') NOT NULL,
    `content` LONGTEXT NOT NULL,
    `contentType` ENUM('text', 'image_path', 'function_call', 'function_result') NOT NULL DEFAULT 'text',
    `attachmentPath` VARCHAR(512) NULL,
    `agentType` ENUM('supervisor', 'chef_agent', 'data_agent', 'evaluator') NULL,
    `tokensUsed` INTEGER NULL,
    `latencyMs` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `chat_messages_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_evaluation_logs` (
    `id` CHAR(36) NOT NULL,
    `sessionId` CHAR(36) NOT NULL,
    `weeklyPlanId` CHAR(36) NULL,
    `attemptNumber` TINYINT NOT NULL,
    `evaluationResult` ENUM('pass', 'fail', 'max_retries_exceeded') NOT NULL,
    `failureReasons` JSON NULL,
    `budgetAllocated` INTEGER NOT NULL,
    `budgetCalculated` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_provider_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` ENUM('gemini', 'openai', 'anthropic') NOT NULL,
    `modelName` VARCHAR(100) NOT NULL,
    `encryptedApiKey` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    `maxTokens` INTEGER NOT NULL DEFAULT 8192,
    `usageNote` VARCHAR(255) NULL,
    `activatedBy` CHAR(36) NULL,
    `activatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ai_provider_configs_isActive_provider_idx`(`isActive`, `provider`),
    UNIQUE INDEX `ai_provider_configs_provider_modelName_key`(`provider`, `modelName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `logoPath` VARCHAR(512) NULL,
    `websiteUrl` VARCHAR(512) NULL,
    `contactEmail` VARCHAR(255) NULL,
    `status` ENUM('active', 'paused', 'terminated') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsor_campaigns` (
    `id` CHAR(36) NOT NULL,
    `sponsorId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `campaignType` ENUM('banner', 'recipe_highlight', 'ingredient_promo') NOT NULL,
    `targetAudience` JSON NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `status` ENUM('scheduled', 'active', 'ended') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_recipes` (
    `campaignId` CHAR(36) NOT NULL,
    `recipeId` CHAR(36) NOT NULL,
    `priority` TINYINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`campaignId`, `recipeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_purchase_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ingredientId` INTEGER NOT NULL,
    `sponsorId` INTEGER NULL,
    `platform` ENUM('shopee', 'lazada', 'tiki', 'sendo', 'bachhoaxanh', 'other') NOT NULL,
    `productName` VARCHAR(255) NOT NULL,
    `purchaseUrl` VARCHAR(1024) NOT NULL,
    `priceVnd` INTEGER NULL,
    `unitDescription` VARCHAR(100) NULL,
    `thumbnailPath` VARCHAR(512) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` TINYINT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ingredient_purchase_links_ingredientId_isActive_priority_idx`(`ingredientId`, `isActive`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_activity_logs` (
    `id` CHAR(36) NOT NULL,
    `adminId` CHAR(36) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `targetEntity` VARCHAR(100) NULL,
    `targetId` VARCHAR(36) NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('expiry_warning', 'budget_alert', 'plan_ready', 'system', 'promo') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `notifications_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_categories` ADD CONSTRAINT `ingredient_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ingredient_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredients` ADD CONSTRAINT `ingredients_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ingredient_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_ingredients` ADD CONSTRAINT `recipe_ingredients_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_steps` ADD CONSTRAINT `recipe_steps_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_tags` ADD CONSTRAINT `recipe_tags_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recipe_tags` ADD CONSTRAINT `recipe_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_saved_recipes` ADD CONSTRAINT `user_saved_recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_saved_recipes` ADD CONSTRAINT `user_saved_recipes_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fridge_items` ADD CONSTRAINT `fridge_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fridge_items` ADD CONSTRAINT `fridge_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_scan_logs` ADD CONSTRAINT `ingredient_scan_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_allergies` ADD CONSTRAINT `user_allergies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_allergies` ADD CONSTRAINT `user_allergies_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_plans` ADD CONSTRAINT `weekly_plans_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_plans` ADD CONSTRAINT `weekly_plans_aiSessionId_fkey` FOREIGN KEY (`aiSessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_plans` ADD CONSTRAINT `daily_plans_weeklyPlanId_fkey` FOREIGN KEY (`weeklyPlanId`) REFERENCES `weekly_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meal_slots` ADD CONSTRAINT `meal_slots_dailyPlanId_fkey` FOREIGN KEY (`dailyPlanId`) REFERENCES `daily_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meal_slots` ADD CONSTRAINT `meal_slots_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_lists` ADD CONSTRAINT `shopping_lists_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_lists` ADD CONSTRAINT `shopping_lists_weeklyPlanId_fkey` FOREIGN KEY (`weeklyPlanId`) REFERENCES `weekly_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_list_items` ADD CONSTRAINT `shopping_list_items_shoppingListId_fkey` FOREIGN KEY (`shoppingListId`) REFERENCES `shopping_lists`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shopping_list_items` ADD CONSTRAINT `shopping_list_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_system_prompts` ADD CONSTRAINT `ai_system_prompts_activatedBy_fkey` FOREIGN KEY (`activatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_evaluation_logs` ADD CONSTRAINT `ai_evaluation_logs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_evaluation_logs` ADD CONSTRAINT `ai_evaluation_logs_weeklyPlanId_fkey` FOREIGN KEY (`weeklyPlanId`) REFERENCES `weekly_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_provider_configs` ADD CONSTRAINT `ai_provider_configs_activatedBy_fkey` FOREIGN KEY (`activatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsor_campaigns` ADD CONSTRAINT `sponsor_campaigns_sponsorId_fkey` FOREIGN KEY (`sponsorId`) REFERENCES `sponsors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipes` ADD CONSTRAINT `campaign_recipes_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `sponsor_campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipes` ADD CONSTRAINT `campaign_recipes_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_purchase_links` ADD CONSTRAINT `ingredient_purchase_links_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingredient_purchase_links` ADD CONSTRAINT `ingredient_purchase_links_sponsorId_fkey` FOREIGN KEY (`sponsorId`) REFERENCES `sponsors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_activity_logs` ADD CONSTRAINT `admin_activity_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
