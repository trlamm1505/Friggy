-- Migration: V2 Family Sharing — Shared Fridge, Meal Plan & Shopping List
-- Applied via: prisma db push (schema already synced to DB)
-- Migration file created manually to track history

-- ─────────────────────────────────────────────────────────────────────────────
-- FridgeItem: thêm familyGroupId, version, lastUpdatedById
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `fridge_items`
  ADD COLUMN `familyGroupId` CHAR(36) NULL AFTER `userId`,
  ADD COLUMN `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic Locking chống race condition' AFTER `addedBy`,
  ADD COLUMN `lastUpdatedById` CHAR(36) NULL COMMENT 'Người sửa đổi gần nhất' AFTER `version`;

-- Index cho family fridge query
CREATE INDEX `fridge_items_familyGroupId_expiresAt_idx` ON `fridge_items`(`familyGroupId` ASC, `expiresAt` ASC);

-- FK: fridge_items.familyGroupId → family_groups.id
ALTER TABLE `fridge_items`
  ADD CONSTRAINT `fridge_items_familyGroupId_fkey`
  FOREIGN KEY (`familyGroupId`) REFERENCES `family_groups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- WeeklyPlan: thêm familyGroupId
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `weekly_plans`
  ADD COLUMN `familyGroupId` CHAR(36) NULL COMMENT 'null = Cá nhân | có giá trị = Thực đơn gia đình' AFTER `userId`;

-- Index cho family weekly plan query
CREATE INDEX `weekly_plans_familyGroupId_weekStartDate_idx` ON `weekly_plans`(`familyGroupId` ASC, `weekStartDate` ASC);

-- FK: weekly_plans.familyGroupId → family_groups.id
ALTER TABLE `weekly_plans`
  ADD CONSTRAINT `weekly_plans_familyGroupId_fkey`
  FOREIGN KEY (`familyGroupId`) REFERENCES `family_groups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- ShoppingList: thêm familyGroupId
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `shopping_lists`
  ADD COLUMN `familyGroupId` CHAR(36) NULL COMMENT 'null = Cá nhân | có giá trị = Giỏ đi chợ gia đình' AFTER `userId`;

-- Index cho family shopping list query
CREATE INDEX `shopping_lists_familyGroupId_idx` ON `shopping_lists`(`familyGroupId` ASC);

-- FK: shopping_lists.familyGroupId → family_groups.id
ALTER TABLE `shopping_lists`
  ADD CONSTRAINT `shopping_lists_familyGroupId_fkey`
  FOREIGN KEY (`familyGroupId`) REFERENCES `family_groups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes bổ sung (payment_transactions, family_members)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX `payment_transactions_planId_fkey` ON `payment_transactions`(`planId` ASC);
CREATE INDEX `family_members_userId_fkey` ON `family_members`(`userId` ASC);
