-- Create family_groups table
CREATE TABLE `family_groups` (
  `id`        CHAR(36)     NOT NULL,
  `ownerId`   CHAR(36)     NOT NULL,
  `status`    VARCHAR(20)  NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  `deletedAt` DATETIME     NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `family_groups_ownerId_key` (`ownerId`),
  INDEX `family_groups_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create family_members table
CREATE TABLE `family_members` (
  `id`            CHAR(36)     NOT NULL,
  `familyGroupId` CHAR(36)     NOT NULL,
  `userId`        CHAR(36)     NULL,
  `invitedEmail`  VARCHAR(255) NOT NULL,
  `status`        VARCHAR(20)  NOT NULL,
  `inviteToken`   VARCHAR(100) NOT NULL,
  `invitedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `joinedAt`      DATETIME     NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `family_members_inviteToken_key` (`inviteToken`),
  UNIQUE INDEX `family_members_familyGroupId_invitedEmail_key` (`familyGroupId`, `invitedEmail`),
  INDEX `family_members_familyGroupId_status_idx` (`familyGroupId`, `status`),
  INDEX `family_members_inviteToken_idx` (`inviteToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add enum values to notifications.type
-- MySQL ENUM: cần ALTER TABLE thêm giá trị mới
ALTER TABLE `notifications`
  MODIFY `type` ENUM(
    'expiry_warning',
    'budget_alert',
    'plan_ready',
    'system',
    'promo',
    'subscription_reminder',
    'family_invite',
    'family_joined',
    'family_rejected',
    'family_removed',
    'family_dissolved'
  ) NOT NULL;
