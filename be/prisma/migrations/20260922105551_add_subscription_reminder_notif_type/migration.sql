-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('expiry_warning', 'budget_alert', 'plan_ready', 'system', 'promo', 'subscription_reminder') NOT NULL;
