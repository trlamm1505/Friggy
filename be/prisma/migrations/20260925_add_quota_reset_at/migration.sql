-- AlterTable: Thêm cột quotaResetAt vào bảng user_subscriptions
-- Mục đích: Reset quota AI ngay khi user mua gói mới (không cần chờ đầu tuần)
ALTER TABLE `user_subscriptions`
  ADD COLUMN `quotaResetAt` DATETIME NULL;
