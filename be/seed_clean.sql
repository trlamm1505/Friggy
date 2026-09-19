-- ================================================================
-- FRIGGY DATABASE SEED DATA (cleaned up)
-- Exported: 2026-09-16
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------
INSERT IGNORE INTO `roles` (`id`, `name`, `description`, `createdAt`, `deletedAt`) VALUES
  (1, 'admin', 'Ban quản trị hệ thống — toàn quyền truy cập Admin Dashboard', '2026-09-09 15:50:45', NULL),
  (2, 'user',  'Người dùng cuối — sử dụng ứng dụng quản lý tủ lạnh',          '2026-09-09 15:50:45', NULL);

-- ----------------------------------------------------------------
-- subscription_plans
-- ----------------------------------------------------------------
INSERT IGNORE INTO `subscription_plans` (`id`, `name`, `displayName`, `priceVnd`, `billingCycle`, `features`, `aiUsagePerWeek`, `isActive`, `createdAt`, `deletedAt`) VALUES
  (1, 'free',       'Gói Miễn Phí',   0,      'forever', '["Quản lý tủ lạnh", "Gợi ý công thức cơ bản"]',                      2,  1, '2026-09-14 17:40:16', NULL),
  (2, 'individual', 'Gói Cá Nhân',   79000,   'monthly', '["AI không giới hạn", "Lập thực đơn tuần", "Scan ảnh"]',            -1,  1, '2026-09-14 17:40:16', NULL),
  (3, 'family',     'Gói Gia Đình',  149000,  'monthly', '["Tất cả tính năng Individual", "Tối đa 5 thành viên"]',            -1,  1, '2026-09-14 17:40:16', NULL);

-- ----------------------------------------------------------------
-- users (2 accounts)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `phone`, `googleId`, `googleEmail`, `authProvider`, `status`, `roleId`, `lastLoginAt`, `createdAt`, `updatedAt`, `deletedAt`, `isOnboardingCompleted`, `name`) VALUES
  ('a27cd6d0-197b-48e1-a203-680449cf0c43', NULL, '107246848946008598823', 'mdtrong1305@gmail.com',        'google', 'active', 1, '2026-09-14 08:16:02', '2026-09-10 16:55:34', '2026-09-14 08:16:02', NULL, 0, 'Mai Đức Trọng'),
  ('dc0c12a5-7dd6-4041-bb3b-5942d4dbcf3f', NULL, '103968261881483353844', 'trongmdse182148@fpt.edu.vn',  'google', 'active', 2, '2026-09-14 17:48:42', '2026-09-14 15:32:44', '2026-09-14 17:48:42', NULL, 0, 'MAI DUC TRONG (K18 HCM)');

-- ----------------------------------------------------------------
-- user_profiles
-- ----------------------------------------------------------------
INSERT IGNORE INTO `user_profiles` (`id`, `userId`, `displayName`, `avatarPath`, `gender`, `dateOfBirth`, `updatedAt`, `deletedAt`) VALUES
  ('0941813a-c82f-421f-856e-6f737849356b', 'a27cd6d0-197b-48e1-a203-680449cf0c43', 'Mai Đức Trọng',          NULL, NULL, NULL, '2026-09-10 17:17:56', NULL),
  ('0302e7db-f01d-4922-b7f4-da8d67e19134', 'dc0c12a5-7dd6-4041-bb3b-5942d4dbcf3f', 'MAI DUC TRONG (K18 HCM)', NULL, NULL, NULL, '2026-09-14 15:32:44', NULL);

-- ----------------------------------------------------------------
-- user_subscriptions
-- ----------------------------------------------------------------
INSERT IGNORE INTO `user_subscriptions` (`id`, `userId`, `planId`, `startDate`, `endDate`, `status`, `paymentRef`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
  ('58b417b3-b063-11f1-8f91-4a1fa1f06f0c', 'dc0c12a5-7dd6-4041-bb3b-5942d4dbcf3f', 2, '2026-09-14', '2027-09-14', 'active', NULL, '2026-09-14 17:40:16', '2026-09-14 17:40:16', NULL);

-- ----------------------------------------------------------------
-- user_preferences
-- ----------------------------------------------------------------
INSERT IGNORE INTO `user_preferences` (`id`, `userId`, `weeklyBudget`, `dailyCalorieTarget`, `dietaryStyle`, `maxCookTimeMinutes`, `skillLevel`, `householdSize`, `aiPersonalityMode`, `updatedAt`, `deletedAt`, `activityLevel`, `cookingFrequency`, `primaryGoal`, `weight`) VALUES
  ('382f9212-b052-11f1-8f91-4a1fa1f06f0c', 'dc0c12a5-7dd6-4041-bb3b-5942d4dbcf3f', 500000, 2000, NULL, 45, 'intermediate', 1, 'friendly', '2026-09-14 15:37:40', NULL, 'moderate', 'daily', 'eat_healthy', NULL);

-- ----------------------------------------------------------------
-- ingredient_categories (18 categories)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `ingredient_categories` (`id`, `name`, `iconPath`, `parentId`, `createdAt`, `deletedAt`) VALUES
  (1,  'Rau củ quả',        '/public/icons/cat_vegetables.png', NULL, '2026-09-09 15:50:46', NULL),
  (2,  'Thịt',              '/public/icons/cat_meat.png',       NULL, '2026-09-09 15:50:46', NULL),
  (3,  'Hải sản',           '/public/icons/cat_seafood.png',    NULL, '2026-09-09 15:50:46', NULL),
  (4,  'Trứng & Sữa',       '/public/icons/cat_dairy.png',      NULL, '2026-09-09 15:50:46', NULL),
  (5,  'Gia vị cơ bản',     '/public/icons/cat_spices.png',     NULL, '2026-09-09 15:50:46', NULL),
  (6,  'Ngũ cốc & Bột',     '/public/icons/cat_grains.png',     NULL, '2026-09-09 15:50:46', NULL),
  (7,  'Đồ uống',           '/public/icons/cat_drinks.png',     NULL, '2026-09-09 15:50:46', NULL),
  (8,  'Đồ khô',            '/public/icons/cat_dry.png',        NULL, '2026-09-09 15:50:46', NULL),
  (9,  'Nước chấm & Sốt',   '/public/icons/cat_sauces.png',     NULL, '2026-09-09 15:50:46', NULL),
  (10, 'Đậu & Hạt',         '/public/icons/cat_beans.png',      NULL, '2026-09-09 15:50:46', NULL),
  (11, 'Rau lá xanh',       '/public/icons/cat_leafy.png',      1,    '2026-09-09 15:50:46', NULL),
  (12, 'Củ & Quả',          '/public/icons/cat_roots.png',      1,    '2026-09-09 15:50:46', NULL),
  (13, 'Nấm',               '/public/icons/cat_mushroom.png',   1,    '2026-09-09 15:50:46', NULL),
  (14, 'Thịt heo',          '/public/icons/cat_pork.png',       2,    '2026-09-09 15:50:46', NULL),
  (15, 'Thịt bò',           '/public/icons/cat_beef.png',       2,    '2026-09-09 15:50:46', NULL),
  (16, 'Thịt gà',           '/public/icons/cat_chicken.png',    2,    '2026-09-09 15:50:46', NULL),
  (17, 'Cá',                '/public/icons/cat_fish.png',       3,    '2026-09-09 15:50:46', NULL),
  (18, 'Tôm & Cua',         '/public/icons/cat_shrimp.png',     3,    '2026-09-09 15:50:46', NULL);

-- ----------------------------------------------------------------
-- ingredients (61 ingredients)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `ingredients` (`id`, `name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
  -- Rau lá xanh (cat 11)
  (1,  'Rau muống',     11, 'bó',   19,  5000,  '/public/ingredients/rau_muong.jpg',     1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (2,  'Cải thảo',      11, 'kg',   13,  15000, '/public/ingredients/cai_thao.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (3,  'Rau cải xanh',  11, 'bó',   25,  7000,  '/public/ingredients/cai_xanh.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (4,  'Xà lách',       11, 'bó',   15,  8000,  '/public/ingredients/xa_lach.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (5,  'Rau húng quế',  11, 'bó',   22,  5000,  '/public/ingredients/rau_hung.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (6,  'Ngò rí',        11, 'bó',   20,  4000,  '/public/ingredients/ngo_ri.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (7,  'Hành lá',       11, 'bó',   32,  5000,  '/public/ingredients/hanh_la.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (8,  'Rau mồng tơi',  11, 'bó',   19,  5000,  '/public/ingredients/mong_toi.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Củ & Quả (cat 12)
  (9,  'Cà chua',       12, 'kg',   18,  20000, '/public/ingredients/ca_chua.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (10, 'Khoai tây',     12, 'kg',   77,  25000, '/public/ingredients/khoai_tay.jpg',     1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (11, 'Cà rốt',        12, 'kg',   41,  18000, '/public/ingredients/ca_rot.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (12, 'Hành tây',      12, 'kg',   40,  20000, '/public/ingredients/hanh_tay.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (13, 'Tỏi',           12, 'củ',   149, 5000,  '/public/ingredients/toi.jpg',           1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (14, 'Gừng',          12, 'củ',   80,  8000,  '/public/ingredients/gung.jpg',          1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (15, 'Ớt đỏ',         12, 'quả',  40,  2000,  '/public/ingredients/ot_do.jpg',         1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (16, 'Bắp ngô',       12, 'bắp',  86,  5000,  '/public/ingredients/bap_ngo.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (17, 'Đậu bắp',       12, 'kg',   33,  25000, '/public/ingredients/dau_bap.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (18, 'Bí đỏ',         12, 'kg',   26,  15000, '/public/ingredients/bi_do.jpg',         1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (19, 'Cà tím',        12, 'kg',   25,  20000, '/public/ingredients/ca_tim.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (20, 'Khổ qua',       12, 'quả',  17,  8000,  '/public/ingredients/kho_qua.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Nấm (cat 13)
  (21, 'Nấm rơm',       13, 'kg',   22,  40000, '/public/ingredients/nam_rom.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (22, 'Nấm hương',     13, 'gram', 28,  8000,  '/public/ingredients/nam_huong.jpg',     0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (23, 'Nấm kim châm',  13, 'gói',  37,  15000, '/public/ingredients/nam_kim_cham.jpg',  0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Thịt heo (cat 14)
  (24, 'Thịt ba chỉ',   14, 'gram', 518, 75000, '/public/ingredients/ba_chi.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (25, 'Thịt nạc vai',  14, 'gram', 143, 65000, '/public/ingredients/nac_vai.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (26, 'Sườn heo',      14, 'gram', 282, 90000, '/public/ingredients/suon_heo.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (27, 'Chân giò heo',  14, 'gram', 210, 55000, '/public/ingredients/chan_gio.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (28, 'Xương heo',     14, 'gram', 130, 35000, '/public/ingredients/xuong_heo.jpg',     1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Thịt bò (cat 15)
  (29, 'Thịt bò xào',   15, 'gram', 250, 150000,'/public/ingredients/bo_xao.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (30, 'Bắp bò',        15, 'gram', 180, 120000,'/public/ingredients/bap_bo.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (31, 'Xương bò',      15, 'gram', 140, 60000, '/public/ingredients/xuong_bo.jpg',      0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Thịt gà (cat 16)
  (32, 'Đùi gà',        16, 'gram', 209, 65000, '/public/ingredients/dui_ga.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (33, 'Ức gà',         16, 'gram', 165, 70000, '/public/ingredients/uc_ga.jpg',         1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (34, 'Gà nguyên con', 16, 'con',  215, 150000,'/public/ingredients/ga_nguyen.jpg',     1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (35, 'Cánh gà',       16, 'gram', 222, 60000, '/public/ingredients/canh_ga.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Cá (cat 17)
  (36, 'Cá basa',       17, 'gram', 92,  60000, '/public/ingredients/ca_basa.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (37, 'Cá thu',        17, 'gram', 139, 80000, '/public/ingredients/ca_thu.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (38, 'Cá lóc',        17, 'gram', 102, 90000, '/public/ingredients/ca_loc.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (39, 'Cá hồi',        17, 'gram', 206, 200000,'/public/ingredients/ca_hoi.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Tôm & Cua (cat 18)
  (40, 'Tôm sú',        18, 'gram', 99,  150000,'/public/ingredients/tom_su.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (41, 'Tôm thẻ',       18, 'gram', 85,  100000,'/public/ingredients/tom_the.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (42, 'Mực',           18, 'gram', 92,  120000,'/public/ingredients/muc.jpg',           0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Trứng & Sữa (cat 4)
  (43, 'Trứng gà',      4,  'quả',  143, 4000,  '/public/ingredients/trung_ga.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (44, 'Trứng vịt',     4,  'quả',  185, 5000,  '/public/ingredients/trung_vit.jpg',     0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (45, 'Sữa tươi',      4,  'ml',   61,  35000, '/public/ingredients/sua_tuoi.jpg',      0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Gia vị (cat 5)
  (46, 'Muối',          5,  'gram', 0,   5000,  '/public/ingredients/muoi.jpg',          1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (47, 'Đường',         5,  'gram', 387, 20000, '/public/ingredients/duong.jpg',         1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (48, 'Tiêu đen',      5,  'gram', 251, 15000, '/public/ingredients/tieu.jpg',          1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (49, 'Dầu ăn',        5,  'ml',   884, 30000, '/public/ingredients/dau_an.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (50, 'Bột ngọt',      5,  'gram', 0,   10000, '/public/ingredients/bot_ngot.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Nước chấm (cat 9)
  (51, 'Nước mắm',      9,  'ml',   35,  25000, '/public/ingredients/nuoc_mam.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (52, 'Xì dầu',        9,  'ml',   53,  20000, '/public/ingredients/xi_dau.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (53, 'Tương ớt',      9,  'ml',   90,  15000, '/public/ingredients/tuong_ot.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (54, 'Dấm',           9,  'ml',   18,  10000, '/public/ingredients/dam.jpg',           1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Ngũ cốc (cat 6)
  (55, 'Gạo tẻ',        6,  'gram', 365, 18000, '/public/ingredients/gao_te.jpg',        1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (56, 'Bún tươi',      6,  'gram', 109, 10000, '/public/ingredients/bun_tuoi.jpg',      1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (57, 'Mì spaghetti',  6,  'gram', 371, 25000, '/public/ingredients/mi_spaghetti.jpg',  0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (58, 'Bột mì',        6,  'gram', 364, 15000, '/public/ingredients/bot_mi.jpg',        0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  -- Đậu & Hạt (cat 10)
  (59, 'Đậu phụ',       10, 'miếng',76, 8000,  '/public/ingredients/dau_phu.jpg',       1, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (60, 'Đậu đen',       10, 'gram', 339, 25000, '/public/ingredients/dau_den.jpg',       0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL),
  (61, 'Lạc rang',      10, 'gram', 567, 30000, '/public/ingredients/lac_rang.jpg',      0, '2026-09-09 15:50:46', '2026-09-09 15:50:46', NULL);

-- ----------------------------------------------------------------
-- recipes (15 recipes: 5 breakfast + 5 lunch + 5 dinner)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `recipes` (`id`, `title`, `description`, `thumbnailPath`, `mealType`, `cookTimeMinutes`, `servings`, `difficultyLevel`, `estimatedCost`, `isAiGenerated`, `authorId`, `status`, `createdAt`, `updatedAt`, `deletedAt`) VALUES
  -- Breakfast
  ('ffb34583-b054-11f1-8f91-4a1fa1f06f0c', 'Phở bò',               'Phở bò truyền thống với nước dùng hầm xương ninh lâu',        NULL, 'breakfast', 60, 2, 'medium', 45000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb4b01b-b054-11f1-8f91-4a1fa1f06f0c', 'Bánh mì trứng',         'Bánh mì kẹp trứng ốp la, rau thơm và tương ớt',               NULL, 'breakfast', 10, 1, 'easy',   15000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb4b272-b054-11f1-8f91-4a1fa1f06f0c', 'Xôi xéo',               'Xôi nếp với đậu xanh, hành phi thơm ngon',                    NULL, 'breakfast', 45, 2, 'medium', 20000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb4b2ea-b054-11f1-8f91-4a1fa1f06f0c', 'Cháo lòng',             'Cháo trắng nấu với lòng heo, gừng tươi',                      NULL, 'breakfast', 40, 2, 'easy',   35000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb4b33d-b054-11f1-8f91-4a1fa1f06f0c', 'Bún bò Huế',            'Bún bò cay đặc trưng Huế với sả và mắm ruốc',                 NULL, 'breakfast', 90, 3, 'hard',   50000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  -- Lunch
  ('ffb76aee-b054-11f1-8f91-4a1fa1f06f0c', 'Cơm tấm sườn bì chả',  'Cơm tấm với sườn nướng, bì và chả trứng hấp',                 NULL, 'lunch',     30, 1, 'medium', 40000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb76ea2-b054-11f1-8f91-4a1fa1f06f0c', 'Bún thịt nướng',        'Bún với thịt heo nướng, đồ chua và nước mắm',                 NULL, 'lunch',     25, 2, 'easy',   35000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb76f20-b054-11f1-8f91-4a1fa1f06f0c', 'Cơm rang dưa bò',       'Cơm chiên với dưa cải và thịt bò xào',                        NULL, 'lunch',     20, 2, 'easy',   30000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb76f74-b054-11f1-8f91-4a1fa1f06f0c', 'Bún đậu mắm tôm',       'Bún tươi với đậu hũ chiên, mắm tôm pha',                      NULL, 'lunch',     15, 2, 'easy',   25000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb76fb9-b054-11f1-8f91-4a1fa1f06f0c', 'Mì quảng',              'Mì sợi vàng với tôm thịt, bánh tráng và rau sống',            NULL, 'lunch',     35, 2, 'medium', 40000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  -- Dinner
  ('ffb975d6-b054-11f1-8f91-4a1fa1f06f0c', 'Lẩu thái hải sản',      'Lẩu chua cay với tôm mực và rau cải',                         NULL, 'dinner',    45, 4, 'medium', 200000, 0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb979b0-b054-11f1-8f91-4a1fa1f06f0c', 'Cá kho tộ',             'Cá lóc kho nước màu, gừng sả đặm đà',                        NULL, 'dinner',    40, 3, 'medium', 80000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb97a3a-b054-11f1-8f91-4a1fa1f06f0c', 'Thịt kho trứng',        'Thịt ba chỉ kho với trứng luộc nước dừa',                    NULL, 'dinner',    50, 4, 'easy',   90000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb97a84-b054-11f1-8f91-4a1fa1f06f0c', 'Canh chua cá',          'Canh chua me với cá, cà chua và giá đỗ',                      NULL, 'dinner',    25, 4, 'easy',   60000,  0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL),
  ('ffb97acc-b054-11f1-8f91-4a1fa1f06f0c', 'Gà nướng muối ớt',      'Gà nướng với gia vị muối ớt đặc trưng miền Trung',            NULL, 'dinner',    60, 4, 'medium', 120000, 0, NULL, 'published', '2026-09-14 15:57:33', '2026-09-14 15:57:33', NULL);

-- ----------------------------------------------------------------
-- tags (22 tags)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `tags` (`id`, `name`, `type`, `createdAt`, `deletedAt`) VALUES
  (1,  'Món Bắc',             'cuisine',   '2026-09-09 15:50:46', NULL),
  (2,  'Món Nam',             'cuisine',   '2026-09-09 15:50:46', NULL),
  (3,  'Món Trung',           'cuisine',   '2026-09-09 15:50:46', NULL),
  (4,  'Món Hàn',             'cuisine',   '2026-09-09 15:50:46', NULL),
  (5,  'Món Nhật',            'cuisine',   '2026-09-09 15:50:46', NULL),
  (6,  'Món Tây',             'cuisine',   '2026-09-09 15:50:46', NULL),
  (7,  'Chay thuần',          'dietary',   '2026-09-09 15:50:46', NULL),
  (8,  'Ít calo',             'dietary',   '2026-09-09 15:50:46', NULL),
  (9,  'Giàu đạm',            'dietary',   '2026-09-09 15:50:46', NULL),
  (10, 'Không gluten',        'dietary',   '2026-09-09 15:50:46', NULL),
  (11, 'Phù hợp giảm cân',    'dietary',   '2026-09-09 15:50:46', NULL),
  (12, 'Xào nhanh',           'technique', '2026-09-09 15:50:46', NULL),
  (13, 'Hấp',                 'technique', '2026-09-09 15:50:46', NULL),
  (14, 'Luộc',                'technique', '2026-09-09 15:50:46', NULL),
  (15, 'Chiên',               'technique', '2026-09-09 15:50:46', NULL),
  (16, 'Kho',                 'technique', '2026-09-09 15:50:46', NULL),
  (17, 'Nướng',               'technique', '2026-09-09 15:50:46', NULL),
  (18, 'Nấu canh',            'technique', '2026-09-09 15:50:46', NULL),
  (19, 'Bữa sáng nhanh',      'occasion',  '2026-09-09 15:50:46', NULL),
  (20, 'Cơm gia đình',        'occasion',  '2026-09-09 15:50:46', NULL),
  (21, 'Tiệc cuối tuần',      'occasion',  '2026-09-09 15:50:46', NULL),
  (22, 'Dã ngoại',            'occasion',  '2026-09-09 15:50:46', NULL);

-- ----------------------------------------------------------------
-- ai_provider_configs (1 active Gemini)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `ai_provider_configs` (`id`, `provider`, `modelName`, `encryptedApiKey`, `isActive`, `temperature`, `maxTokens`, `usageNote`, `activatedBy`, `updatedAt`, `createdAt`, `deletedAt`) VALUES
  (3, 'gemini', 'gemini-2.5-flash-lite',
   '98a790c52e646c24e9bbb25062607b62:a3b73e0803a3d8d9763fa4b2484921a1635a94bc8fd0579a9c545b1efafcfda0ee76a9a41be814d04efc94dc2a9b45c510a2e89f3590f0cde145fbdbc920002612283753bfdb9cf4c3277dfcde8f185b',
   1, 0.7, 8192, 'baseURL=https://platform.beeknoee.com/v1',
   'a27cd6d0-197b-48e1-a203-680449cf0c43', '2026-09-14 08:29:01', '2026-09-14 08:25:31', NULL);

-- ----------------------------------------------------------------
-- notifications (all unread: isRead = 0)
-- ----------------------------------------------------------------
INSERT IGNORE INTO `notifications` (`id`, `userId`, `type`, `title`, `body`, `isRead`, `metadata`, `createdAt`, `readAt`, `deletedAt`) VALUES
  ('n3333333-b054-11f1-8f91-4a1fa1f06f01', '7f85f26b-1780-427b-b40b-fe7db50e8c25', 'expiry_warning', 'Sữa tươi Vinamilk sắp hết hạn', 'Hộp Sữa tươi Vinamilk trong Tủ lạnh chính sẽ hết hạn trong 2 ngày tới. Hãy sử dụng sớm nhé!', 0, NULL, '2026-09-19 20:00:00', NULL, NULL),
  ('n3333333-b054-11f1-8f91-4a1fa1f06f02', '7f85f26b-1780-427b-b40b-fe7db50e8c25', 'plan_ready', 'Nhắc đi chợ cho tuần tới', 'Friggy đã tự động gợi ý danh sách mua sắm thực phẩm cho tuần tới cùng các món ăn hấp dẫn.', 0, NULL, '2026-09-19 18:30:00', NULL, NULL),
  ('n3333333-b054-11f1-8f91-4a1fa1f06f03', '7f85f26b-1780-427b-b40b-fe7db50e8c25', 'expiry_warning', 'Thịt bò bít tết hết hạn bảo quản', 'Thực phẩm Thịt bò Mỹ đông lạnh trong Ngăn đông cần được chế biến ngay hôm nay.', 0, NULL, '2026-09-18 10:15:00', NULL, NULL),
  ('n3333333-b054-11f1-8f91-4a1fa1f06f04', '7f85f26b-1780-427b-b40b-fe7db50e8c25', 'system', 'Chào mừng bạn đến với Friggy Premium!', 'Tài khoản của bạn đã nâng cấp thành công gói Individual. Khám phá ngay đặc quyền quét camera AI không giới hạn!', 0, NULL, '2026-09-17 14:00:00', NULL, NULL),
  ('n3333333-b054-11f1-8f91-4a1fa1f06f05', '7f85f26b-1780-427b-b40b-fe7db50e8c25', 'system', 'Báo cáo thống kê thực phẩm tuần qua', 'Bạn đã tiết kiệm được 15% lượng thực phẩm lãng phí tuần vừa rồi. Hãy tiếp tục giữ phong độ!', 0, NULL, '2026-09-15 09:00:00', NULL, NULL);

SET FOREIGN_KEY_CHECKS = 1;
