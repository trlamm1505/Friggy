-- Add qrCode column to payment_transactions
ALTER TABLE `payment_transactions`
  ADD COLUMN `qrCode` LONGTEXT NULL AFTER `checkoutUrl`;
