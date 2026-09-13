-- AlterTable
ALTER TABLE `fridge_items` ADD COLUMN `consumedAt` DATETIME(3) NULL,
    MODIFY `addedBy` ENUM('manual', 'ai_scan', 'receipt_scan', 'barcode_scan') NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE `ingredient_scan_logs` ADD COLUMN `barcode` VARCHAR(50) NULL,
    ADD COLUMN `rawText` TEXT NULL,
    ADD COLUMN `scanType` VARCHAR(20) NOT NULL DEFAULT 'image';
