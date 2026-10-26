-- ============================================================
-- FRIGGY — Test Data: Family Sharing (V2)
-- ============================================================
-- Kịch bản test:
--   user_owner  : Chủ gia đình, gói Family, đã có tủ gia đình
--   user_member1: User cá nhân, có đồ trong tủ riêng (chưa join)
--   user_member2: User cá nhân, có đồ trong tủ riêng (chưa join)
--
-- Luồng test:
--   1. owner tạo family group → invite member1, member2 (POST /family/invite)
--   2. member1 acceptInvite   → đồ cá nhân merge vào tủ gia đình
--   3. member2 acceptInvite   → đồ cá nhân merge vào tủ gia đình
--   4. Cả 3 user gọi GET /fridge → đều thấy tủ gia đình chung
--
-- Test cases:
--   [TC-01] GET /fridge (owner)   → thấy tủ gia đình (chỉ đồ của owner)
--   [TC-02] GET /fridge (member1) → thấy tủ cá nhân của member1
--   [TC-03] POST /family/invite   → gửi invite cho member1 & member2
--   [TC-04] POST /family/accept   → member1 accept → đồ cá nhân merge
--   [TC-05] GET /fridge (member1) → giờ thấy tủ gia đình chung
--   [TC-06] PATCH /fridge/items/:id với version cũ → 409 Conflict
--   [TC-07] Socket.IO connect → join room family:{groupId}
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- [A] 3 USER ACCOUNTS
-- Mật khẩu chung: Test@12345
-- ============================================================

-- A1: Chủ gia đình (owner) — Email: family.owner@test.vn
INSERT IGNORE INTO `users`
  (`id`, `email`, `passwordHash`, `authProvider`, `status`, `roleId`, `isOnboardingCompleted`, `name`, `createdAt`, `updatedAt`)
VALUES (
  'fam00001-0000-0000-0000-000000000001',
  'family.owner@test.vn',
  '$2b$10$96ezLLhHcO29v9tjkmdrMeEjEj8QzaaMSTWL.hwrKm9L3pVYkDMW.',
  'email', 'active', 2, 1, 'Trần Văn Tuấn', NOW(), NOW()
);
INSERT IGNORE INTO `user_profiles` (`id`, `userId`, `displayName`, `gender`, `updatedAt`) VALUES
  ('fam00001-0000-0000-0000-000000000001', 'fam00001-0000-0000-0000-000000000001', 'Tuấn (Owner)', 'male', NOW());
INSERT IGNORE INTO `user_preferences`
  (`id`, `userId`, `weeklyBudget`, `householdSize`, `skillLevel`, `aiPersonalityMode`, `updatedAt`)
VALUES
  ('fam00001-0000-0000-0000-000000000001', 'fam00001-0000-0000-0000-000000000001',
   800000, 3, 'intermediate', 'friendly', NOW());

-- A2: Cá nhân độc lập — Email: family.member1@test.vn
INSERT IGNORE INTO `users`
  (`id`, `email`, `passwordHash`, `authProvider`, `status`, `roleId`, `isOnboardingCompleted`, `name`, `createdAt`, `updatedAt`)
VALUES (
  'fam00002-0000-0000-0000-000000000002',
  'family.member1@test.vn',
  '$2b$10$96ezLLhHcO29v9tjkmdrMeEjEj8QzaaMSTWL.hwrKm9L3pVYkDMW.',
  'email', 'active', 2, 1, 'Lê Thị Hoa', NOW(), NOW()
);
INSERT IGNORE INTO `user_profiles` (`id`, `userId`, `displayName`, `gender`, `updatedAt`) VALUES
  ('fam00002-0000-0000-0000-000000000002', 'fam00002-0000-0000-0000-000000000002', 'Hoa', 'female', NOW());

-- A3: Cá nhân độc lập — Email: family.member2@test.vn
INSERT IGNORE INTO `users`
  (`id`, `email`, `passwordHash`, `authProvider`, `status`, `roleId`, `isOnboardingCompleted`, `name`, `createdAt`, `updatedAt`)
VALUES (
  'fam00003-0000-0000-0000-000000000003',
  'family.member2@test.vn',
  '$2b$10$96ezLLhHcO29v9tjkmdrMeEjEj8QzaaMSTWL.hwrKm9L3pVYkDMW.',
  'email', 'active', 2, 1, 'Phạm Anh Khoa', NOW(), NOW()
);
INSERT IGNORE INTO `user_profiles` (`id`, `userId`, `displayName`, `gender`, `updatedAt`) VALUES
  ('fam00003-0000-0000-0000-000000000003', 'fam00003-0000-0000-0000-000000000003', 'Khoa', 'male', NOW());

-- ============================================================
-- [B] SUBSCRIPTION: Owner dùng gói Family (planId=3)
--     Member1, Member2 không có subscription (gói Free)
-- ============================================================
INSERT IGNORE INTO `user_subscriptions`
  (`id`, `userId`, `planId`, `startDate`, `endDate`, `status`, `autoRenew`, `createdAt`, `updatedAt`)
VALUES
  ('fam00001-sub0-0000-0000-000000000001',
   'fam00001-0000-0000-0000-000000000001',
   3, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active', 1, NOW(), NOW());

-- ============================================================
-- [C] FAMILY GROUP (owner đã tạo, chưa có thành viên nào)
--     → Dùng API POST /family/invite để mời member1 & member2
-- ============================================================
INSERT IGNORE INTO `family_groups`
  (`id`, `ownerId`, `status`, `createdAt`, `updatedAt`)
VALUES (
  'famgrp01-0000-0000-0000-000000000001',
  'fam00001-0000-0000-0000-000000000001',
  'active', NOW(), NOW()
);

-- ============================================================
-- [D] TỦ LẠNH CÁ NHÂN CỦA OWNER (familyGroupId = famgrp01...)
--     Owner đã tạo family nên đồ của owner thuộc tủ gia đình
-- ============================================================
INSERT IGNORE INTO `fridge_items`
  (`id`, `userId`, `familyGroupId`, `ingredientId`, `quantity`, `unit`,
   `storageLocation`, `expiresAt`, `addedBy`, `version`, `lastUpdatedById`, `createdAt`, `updatedAt`)
VALUES
  -- Thịt heo 300g (sắp hết hạn 2 ngày)
  ('fi-owner-001-0000-0000-000000000001',
   'fam00001-0000-0000-0000-000000000001',
   'famgrp01-0000-0000-0000-000000000001',
   20, 300, 'g', 'fridge',
   DATE_ADD(NOW(), INTERVAL 2 DAY),
   'manual', 1, 'fam00001-0000-0000-0000-000000000001', NOW(), NOW()),

  -- Trứng gà 6 quả (còn 7 ngày)
  ('fi-owner-002-0000-0000-000000000001',
   'fam00001-0000-0000-0000-000000000001',
   'famgrp01-0000-0000-0000-000000000001',
   30, 6, 'quả', 'fridge',
   DATE_ADD(NOW(), INTERVAL 7 DAY),
   'manual', 1, 'fam00001-0000-0000-0000-000000000001', NOW(), NOW());

-- ============================================================
-- [E] TỦ LẠNH CÁ NHÂN CỦA MEMBER 1 (familyGroupId = NULL)
--     Sau khi acceptInvite → sẽ bị merge vào famgrp01
-- ============================================================
INSERT IGNORE INTO `fridge_items`
  (`id`, `userId`, `familyGroupId`, `ingredientId`, `quantity`, `unit`,
   `storageLocation`, `expiresAt`, `addedBy`, `version`, `lastUpdatedById`, `createdAt`, `updatedAt`)
VALUES
  -- Rau muống 2 bó (còn 2 ngày)
  ('fi-mem1-001-0000-0000-000000000001',
   'fam00002-0000-0000-0000-000000000002',
   NULL,   -- ← cá nhân, chưa thuộc gia đình
   1, 2, 'bó', 'fridge',
   DATE_ADD(NOW(), INTERVAL 2 DAY),
   'manual', 1, 'fam00002-0000-0000-0000-000000000002', NOW(), NOW()),

  -- Tỏi 3 củ (còn 30 ngày)
  ('fi-mem1-002-0000-0000-000000000001',
   'fam00002-0000-0000-0000-000000000002',
   NULL,   -- ← cá nhân
   13, 3, 'củ', 'pantry',
   DATE_ADD(NOW(), INTERVAL 30 DAY),
   'manual', 1, 'fam00002-0000-0000-0000-000000000002', NOW(), NOW()),

  -- Cà chua 0.5kg (còn 3 ngày)
  ('fi-mem1-003-0000-0000-000000000001',
   'fam00002-0000-0000-0000-000000000002',
   NULL,   -- ← cá nhân
   9, 0.5, 'kg', 'fridge',
   DATE_ADD(NOW(), INTERVAL 3 DAY),
   'manual', 1, 'fam00002-0000-0000-0000-000000000002', NOW(), NOW());

-- ============================================================
-- [F] TỦ LẠNH CÁ NHÂN CỦA MEMBER 2 (familyGroupId = NULL)
--     Sau khi acceptInvite → sẽ bị merge vào famgrp01
-- ============================================================
INSERT IGNORE INTO `fridge_items`
  (`id`, `userId`, `familyGroupId`, `ingredientId`, `quantity`, `unit`,
   `storageLocation`, `expiresAt`, `addedBy`, `version`, `lastUpdatedById`, `createdAt`, `updatedAt`)
VALUES
  -- Cà rốt 0.3kg (còn 5 ngày)
  ('fi-mem2-001-0000-0000-000000000001',
   'fam00003-0000-0000-0000-000000000003',
   NULL,   -- ← cá nhân
   11, 0.3, 'kg', 'fridge',
   DATE_ADD(NOW(), INTERVAL 5 DAY),
   'manual', 1, 'fam00003-0000-0000-0000-000000000003', NOW(), NOW()),

  -- Hành lá 1 bó (HẾT HẠN HÔM QUA — test expiring)
  ('fi-mem2-002-0000-0000-000000000001',
   'fam00003-0000-0000-0000-000000000003',
   NULL,   -- ← cá nhân
   7, 1, 'bó', 'fridge',
   DATE_SUB(NOW(), INTERVAL 1 DAY),
   'manual', 1, 'fam00003-0000-0000-0000-000000000003', NOW(), NOW()),

  -- Khoai tây 1kg (còn 10 ngày)
  ('fi-mem2-003-0000-0000-000000000001',
   'fam00003-0000-0000-0000-000000000003',
   NULL,   -- ← cá nhân
   10, 1, 'kg', 'pantry',
   DATE_ADD(NOW(), INTERVAL 10 DAY),
   'manual', 1, 'fam00003-0000-0000-0000-000000000003', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'family_groups'              AS `table`, COUNT(*) AS count FROM `family_groups`  WHERE id = 'famgrp01-0000-0000-0000-000000000001'
UNION ALL SELECT 'fridge (owner - family)',   COUNT(*) FROM `fridge_items` WHERE userId = 'fam00001-0000-0000-0000-000000000001' AND familyGroupId IS NOT NULL AND deletedAt IS NULL
UNION ALL SELECT 'fridge (member1 - cá nhân)',COUNT(*) FROM `fridge_items` WHERE userId = 'fam00002-0000-0000-0000-000000000002' AND familyGroupId IS NULL     AND deletedAt IS NULL
UNION ALL SELECT 'fridge (member2 - cá nhân)',COUNT(*) FROM `fridge_items` WHERE userId = 'fam00003-0000-0000-0000-000000000003' AND familyGroupId IS NULL     AND deletedAt IS NULL;
