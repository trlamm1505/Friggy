-- Migration: add_supplier_application
-- Adds SupplierApplication model for B2B supplier onboarding

CREATE TABLE `supplier_applications` (
  `id`              CHAR(36)     NOT NULL,
  `companyName`     VARCHAR(150) NOT NULL,
  `contactName`     VARCHAR(100) NOT NULL,
  `email`           VARCHAR(255) NOT NULL,
  `phone`           VARCHAR(20)  NULL,
  `address`         VARCHAR(255) NULL,
  `description`     TEXT         NULL,
  `website`         VARCHAR(255) NULL,
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `rejectionReason` TEXT         NULL,
  `reviewedAt`      DATETIME(3)  NULL,
  `reviewedBy`      CHAR(36)     NULL,
  `userId`          CHAR(36)     NULL,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  `deletedAt`       DATETIME(3)  NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `supplier_applications_userId_key` (`userId`),
  INDEX `supplier_applications_status_idx` (`status`),
  INDEX `supplier_applications_email_idx` (`email`),
  INDEX `supplier_applications_reviewedBy_fkey` (`reviewedBy`),

  CONSTRAINT `supplier_applications_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `supplier_applications_reviewedBy_fkey`
    FOREIGN KEY (`reviewedBy`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

