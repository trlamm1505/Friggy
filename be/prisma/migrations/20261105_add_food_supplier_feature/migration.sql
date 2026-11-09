-- Migration: add_food_supplier_feature
-- Created: 2026-11-05
-- Description: Add Supplier/Food Provider feature tables and update NotificationType enum

-- -----------------------------------------------------------------------------
-- 1. Update NotificationType enum to add supplier notification types
-- -----------------------------------------------------------------------------
ALTER TABLE `notifications`
  MODIFY COLUMN `type` ENUM(
    'system',
    'meal_plan_ready',
    'meal_plan_failed',
    'fridge_expiry_warning',
    'subscription_expiring',
    'subscription_expired',
    'family_invited',
    'family_accepted',
    'family_rejected',
    'family_removed',
    'family_dissolved',
    'supplier_package_activated',
    'supplier_package_expiring',
    'supplier_package_expired',
    'ingredient_approved',
    'ingredient_rejected'
  ) NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Create supplier_plans table
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_plans` (
  `id`             INT             NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(50)     NOT NULL,
  `displayName`    VARCHAR(100)    NOT NULL,
  `priceVnd`       INT             NOT NULL,
  `billingCycle`   VARCHAR(20)     NOT NULL,
  `maxIngredients` INT             NOT NULL DEFAULT 50,
  `features`       JSON            NOT NULL,
  `isActive`       TINYINT(1)      NOT NULL DEFAULT 1,
  `createdAt`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt`      DATETIME(3)     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_plans_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Create supplier_profiles table
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_profiles` (
  `id`           CHAR(36)        NOT NULL,
  `userId`       CHAR(36)        NOT NULL,
  `companyName`  VARCHAR(150)    NOT NULL,
  `contactPhone` VARCHAR(20)     NULL,
  `address`      VARCHAR(255)    NULL,
  `logoPath`     VARCHAR(512)    NULL,
  `description`  TEXT            NULL,
  `isVerified`   TINYINT(1)      NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)     NOT NULL,
  `deletedAt`    DATETIME(3)     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_profiles_userId_key` (`userId`),
  CONSTRAINT `supplier_profiles_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Create supplier_subscriptions table
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_subscriptions` (
  `id`          CHAR(36)        NOT NULL,
  `profileId`   CHAR(36)        NOT NULL,
  `planId`      INT             NOT NULL,
  `startDate`   DATE            NOT NULL,
  `endDate`     DATE            NOT NULL,
  `status`      VARCHAR(20)     NOT NULL,
  `autoRenew`   TINYINT(1)      NOT NULL DEFAULT 1,
  `cancelledAt` DATETIME(3)     NULL,
  `createdAt`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)     NOT NULL,
  `deletedAt`   DATETIME(3)     NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_subscriptions_profileId_key` (`profileId`),
  KEY `supplier_subscriptions_status_endDate_idx` (`status`, `endDate`),
  KEY `supplier_subscriptions_planId_idx` (`planId`),
  CONSTRAINT `supplier_subscriptions_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `supplier_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `supplier_subscriptions_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `supplier_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Create supplier_ingredients table
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_ingredients` (
  `id`                 CHAR(36)        NOT NULL,
  `profileId`          CHAR(36)        NOT NULL,
  `name`               VARCHAR(150)    NOT NULL,
  `categoryId`         INT             NOT NULL,
  `defaultUnit`        VARCHAR(30)     NOT NULL,
  `caloriesPer100g`    DOUBLE          NULL,
  `averagePricePerUnit` INT            NULL,
  `imagePath`          VARCHAR(512)    NULL,
  `description`        TEXT            NULL,
  `brand`              VARCHAR(100)    NULL,
  `barcode`            VARCHAR(50)     NULL,
  `status`             ENUM('pending','approved','rejected','archived') NOT NULL DEFAULT 'pending',
  `rejectionReason`    VARCHAR(255)    NULL,
  `reviewedBy`         CHAR(36)        NULL,
  `reviewedAt`         DATETIME(3)     NULL,
  `linkedIngredientId` INT             NULL,
  `createdAt`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`          DATETIME(3)     NOT NULL,
  `deletedAt`          DATETIME(3)     NULL,
  PRIMARY KEY (`id`),
  KEY `supplier_ingredients_profileId_status_idx` (`profileId`, `status`),
  KEY `supplier_ingredients_status_idx` (`status`),
  KEY `supplier_ingredients_categoryId_idx` (`categoryId`),
  KEY `supplier_ingredients_linkedIngredientId_idx` (`linkedIngredientId`),
  CONSTRAINT `supplier_ingredients_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `supplier_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `supplier_ingredients_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `ingredient_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `supplier_ingredients_reviewedBy_fkey`
    FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `supplier_ingredients_linkedIngredientId_fkey`
    FOREIGN KEY (`linkedIngredientId`) REFERENCES `ingredients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Create supplier_payment_transactions table
-- -----------------------------------------------------------------------------
CREATE TABLE `supplier_payment_transactions` (
  `id`                  CHAR(36)        NOT NULL,
  `profileId`           CHAR(36)        NOT NULL,
  `planId`              INT             NOT NULL,
  `type`                VARCHAR(20)     NOT NULL,
  `amount`              INT             NOT NULL,
  `status`              VARCHAR(20)     NOT NULL,
  `paymentMethod`       VARCHAR(30)     NOT NULL DEFAULT 'payos',
  `paymentRef`          VARCHAR(100)    NULL,
  `payosOrderCode`      BIGINT          NULL,
  `payosPaymentLinkId`  VARCHAR(100)    NULL,
  `payosTransactionRef` VARCHAR(100)    NULL,
  `description`         VARCHAR(100)    NULL,
  `checkoutUrl`         VARCHAR(500)    NULL,
  `qrCode`              TEXT            NULL,
  `expiredAt`           DATETIME(3)     NULL,
  `paidAt`              DATETIME(3)     NULL,
  `createdAt`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)     NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_payment_transactions_paymentRef_key` (`paymentRef`),
  UNIQUE KEY `supplier_payment_transactions_payosOrderCode_key` (`payosOrderCode`),
  KEY `supplier_payment_transactions_profileId_idx` (`profileId`),
  KEY `supplier_payment_transactions_status_expiredAt_idx` (`status`, `expiredAt`),
  KEY `supplier_payment_transactions_planId_idx` (`planId`),
  CONSTRAINT `supplier_payment_transactions_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `supplier_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `supplier_payment_transactions_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `supplier_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
