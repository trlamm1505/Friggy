-- AlterTable
ALTER TABLE `ingredient_categories` ADD COLUMN `freezerShelfLifeDays` INTEGER NULL,
    ADD COLUMN `pantryShelfLifeDays` INTEGER NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `name` ENUM('admin', 'manager', 'user') NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `aiQuotaOverride` INTEGER NULL;

-- CreateTable
CREATE TABLE `system_configs` (
    `key` VARCHAR(100) NOT NULL,
    `value` VARCHAR(500) NOT NULL,
    `description` VARCHAR(255) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` CHAR(36) NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
