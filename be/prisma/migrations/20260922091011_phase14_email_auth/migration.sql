/*
  Warnings:

  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - The values [phone] on the enum `users_authProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `otp_verifications` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `users_phone_key` ON `users`;

-- AlterTable
ALTER TABLE `user_subscriptions` ADD COLUMN `autoRenew` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `phone`,
    ADD COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN `passwordHash` VARCHAR(255) NULL,
    MODIFY `authProvider` ENUM('google', 'email') NOT NULL;

-- DropTable
DROP TABLE `otp_verifications`;

-- CreateTable
CREATE TABLE `email_otps` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `otpHash` VARCHAR(255) NOT NULL,
    `purpose` ENUM('register', 'reset_password', 'change_email') NOT NULL,
    `attempts` TINYINT NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_otps_email_purpose_expiresAt_idx`(`email`, `purpose`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
