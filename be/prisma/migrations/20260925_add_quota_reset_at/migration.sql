-- AlterTable: Thêm cột quota_reset_at vào bảng user_subscriptions
-- Mục đích: Reset quota AI ngay khi user mua gói mới (không cần chờ đầu tuần)
ALTER TABLE `user_subscriptions`
  ADD COLUMN `quota_reset_at` DATETIME NULL;
