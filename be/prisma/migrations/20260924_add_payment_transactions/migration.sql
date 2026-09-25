-- Create payment_transactions table (IF NOT EXISTS vì lần đầu chạy đã tạo một phần)
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id`                  CHAR(36)     NOT NULL,
  `userId`              CHAR(36)     NOT NULL,
  `planId`              INT          NOT NULL,
  `type`                VARCHAR(20)  NOT NULL,
  `amount`              INT          NOT NULL,
  `status`              VARCHAR(20)  NOT NULL,
  `paymentMethod`       VARCHAR(30)  NOT NULL DEFAULT 'payos',
  `paymentRef`          VARCHAR(100) NULL,
  `payosOrderCode`      BIGINT       NULL,
  `payosPaymentLinkId`  VARCHAR(100) NULL,
  `payosTransactionRef` VARCHAR(100) NULL,
  `description`         VARCHAR(100) NULL,
  `checkoutUrl`         VARCHAR(500) NULL,
  `expiredAt`           DATETIME     NULL,
  `paidAt`              DATETIME     NULL,
  `createdAt`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `payment_transactions_paymentRef_key` (`paymentRef`),
  UNIQUE INDEX `payment_transactions_payosOrderCode_key` (`payosOrderCode`),
  INDEX `payment_transactions_userId_idx` (`userId`),
  INDEX `payment_transactions_status_expiredAt_idx` (`status`, `expiredAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
