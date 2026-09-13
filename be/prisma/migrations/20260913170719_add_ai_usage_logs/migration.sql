-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `featureType` VARCHAR(50) NOT NULL,
    `tokensUsed` INTEGER NULL DEFAULT 0,
    `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_userId_featureType_usedAt_idx`(`userId`, `featureType`, `usedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
