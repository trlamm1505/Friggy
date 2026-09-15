-- CreateTable
CREATE TABLE `cron_job_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `cronExpression` VARCHAR(50) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `description` VARCHAR(255) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `lastRunStatus` VARCHAR(20) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cron_job_configs_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
