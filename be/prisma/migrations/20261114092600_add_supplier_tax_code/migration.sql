-- Add taxCode column to supplier_applications and supplier_profiles
ALTER TABLE `supplier_applications`
  ADD COLUMN `taxCode` VARCHAR(20) NULL AFTER `companyName`;

ALTER TABLE `supplier_profiles`
  ADD COLUMN `taxCode` VARCHAR(20) NULL AFTER `companyName`;
