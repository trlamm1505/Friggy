-- AlterTable
ALTER TABLE `user_preferences` ADD COLUMN `expiryAlert` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pushNotifications` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `shoppingReminder` BOOLEAN NOT NULL DEFAULT true;
