-- Add pendingPlanId to track plan being purchased without overwriting current active planId
ALTER TABLE `user_subscriptions`
  ADD COLUMN `pendingPlanId` INT NULL;
