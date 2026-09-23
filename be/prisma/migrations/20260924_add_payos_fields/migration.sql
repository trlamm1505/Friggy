-- AddColumn payosOrderCode and payosPaymentLinkId to user_subscriptions
ALTER TABLE `user_subscriptions`
  ADD COLUMN `payosOrderCode` BIGINT NULL,
  ADD COLUMN `payosPaymentLinkId` VARCHAR(100) NULL,
  ADD UNIQUE INDEX `user_subscriptions_payosOrderCode_key` (`payosOrderCode`);
