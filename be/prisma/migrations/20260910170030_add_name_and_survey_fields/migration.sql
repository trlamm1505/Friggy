-- AlterTable
ALTER TABLE `user_preferences` ADD COLUMN `activityLevel` VARCHAR(20) NULL,
    ADD COLUMN `cookingFrequency` VARCHAR(30) NULL,
    ADD COLUMN `height` SMALLINT NULL,
    ADD COLUMN `primaryGoal` VARCHAR(50) NULL,
    ADD COLUMN `weight` SMALLINT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `name` VARCHAR(100) NULL;
