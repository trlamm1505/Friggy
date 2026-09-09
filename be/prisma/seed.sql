-- ============================================================
-- FRIGGY — Seed Data v1.0
-- Chạy file này trực tiếp trên MySQL/MariaDB client
-- Thứ tự: roles → ingredient_categories → ingredients → tags
-- ============================================================

-- ============================================================
-- [1] ROLES (2 roles cố định)
-- ============================================================
INSERT INTO `roles` (`name`, `description`, `createdAt`) VALUES
  ('admin', 'Ban quản trị hệ thống — toàn quyền truy cập Admin Dashboard', NOW()),
  ('user',  'Người dùng cuối — sử dụng ứng dụng quản lý tủ lạnh', NOW());

-- ============================================================
-- [2] INGREDIENT CATEGORIES (Danh mục nguyên liệu phân cấp)
-- ============================================================

-- Level 1: Danh mục cha
INSERT INTO `ingredient_categories` (`name`, `iconPath`, `parentId`, `createdAt`) VALUES
  ('Rau củ quả',   '/public/icons/cat_vegetables.png',  NULL, NOW()),  -- id: 1
  ('Thịt',         '/public/icons/cat_meat.png',         NULL, NOW()),  -- id: 2
  ('Hải sản',      '/public/icons/cat_seafood.png',      NULL, NOW()),  -- id: 3
  ('Trứng & Sữa',  '/public/icons/cat_dairy.png',        NULL, NOW()),  -- id: 4
  ('Gia vị cơ bản','/public/icons/cat_spices.png',       NULL, NOW()),  -- id: 5
  ('Ngũ cốc & Bột','/public/icons/cat_grains.png',       NULL, NOW()),  -- id: 6
  ('Đồ uống',      '/public/icons/cat_drinks.png',       NULL, NOW()),  -- id: 7
  ('Đồ khô',       '/public/icons/cat_dry.png',          NULL, NOW()),  -- id: 8
  ('Nước chấm & Sốt','/public/icons/cat_sauces.png',     NULL, NOW()),  -- id: 9
  ('Đậu & Hạt',    '/public/icons/cat_beans.png',        NULL, NOW());  -- id: 10

-- Level 2: Danh mục con
INSERT INTO `ingredient_categories` (`name`, `iconPath`, `parentId`, `createdAt`) VALUES
  ('Rau lá xanh',  '/public/icons/cat_leafy.png',   1, NOW()),  -- id: 11
  ('Củ & Quả',     '/public/icons/cat_roots.png',   1, NOW()),  -- id: 12
  ('Nấm',          '/public/icons/cat_mushroom.png',1, NOW()),  -- id: 13
  ('Thịt heo',     '/public/icons/cat_pork.png',    2, NOW()),  -- id: 14
  ('Thịt bò',      '/public/icons/cat_beef.png',    2, NOW()),  -- id: 15
  ('Thịt gà',      '/public/icons/cat_chicken.png', 2, NOW()),  -- id: 16
  ('Cá',           '/public/icons/cat_fish.png',    3, NOW()),  -- id: 17
  ('Tôm & Cua',    '/public/icons/cat_shrimp.png',  3, NOW());  -- id: 18

-- ============================================================
-- [3] INGREDIENTS (~50 nguyên liệu phổ biến người Việt)
-- ============================================================

-- Rau lá xanh (categoryId: 11)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Rau muống',     11, 'bó',   19, 5000,  '/public/ingredients/rau_muong.jpg',    TRUE, NOW(), NOW()),
  ('Cải thảo',      11, 'kg',   13, 15000, '/public/ingredients/cai_thao.jpg',     TRUE, NOW(), NOW()),
  ('Rau cải xanh',  11, 'bó',   25, 7000,  '/public/ingredients/cai_xanh.jpg',     TRUE, NOW(), NOW()),
  ('Xà lách',       11, 'bó',   15, 8000,  '/public/ingredients/xa_lach.jpg',      TRUE, NOW(), NOW()),
  ('Rau húng quế',  11, 'bó',   22, 5000,  '/public/ingredients/rau_hung.jpg',     TRUE, NOW(), NOW()),
  ('Ngò rí',        11, 'bó',   20, 4000,  '/public/ingredients/ngo_ri.jpg',       TRUE, NOW(), NOW()),
  ('Hành lá',       11, 'bó',   32, 5000,  '/public/ingredients/hanh_la.jpg',      TRUE, NOW(), NOW()),
  ('Rau mồng tơi',  11, 'bó',   19, 5000,  '/public/ingredients/mong_toi.jpg',     TRUE, NOW(), NOW());

-- Củ & Quả (categoryId: 12)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Cà chua',       12, 'kg',   18, 20000, '/public/ingredients/ca_chua.jpg',      TRUE, NOW(), NOW()),
  ('Khoai tây',     12, 'kg',   77, 25000, '/public/ingredients/khoai_tay.jpg',    TRUE, NOW(), NOW()),
  ('Cà rốt',        12, 'kg',   41, 18000, '/public/ingredients/ca_rot.jpg',       TRUE, NOW(), NOW()),
  ('Hành tây',      12, 'kg',   40, 20000, '/public/ingredients/hanh_tay.jpg',     TRUE, NOW(), NOW()),
  ('Tỏi',           12, 'củ',   149, 5000, '/public/ingredients/toi.jpg',          TRUE, NOW(), NOW()),
  ('Gừng',          12, 'củ',   80, 8000,  '/public/ingredients/gung.jpg',         TRUE, NOW(), NOW()),
  ('Ớt đỏ',         12, 'quả',  40, 2000,  '/public/ingredients/ot_do.jpg',        TRUE, NOW(), NOW()),
  ('Bắp ngô',       12, 'bắp',  86, 5000,  '/public/ingredients/bap_ngo.jpg',      TRUE, NOW(), NOW()),
  ('Đậu bắp',       12, 'kg',   33, 25000, '/public/ingredients/dau_bap.jpg',      FALSE, NOW(), NOW()),
  ('Bí đỏ',         12, 'kg',   26, 15000, '/public/ingredients/bi_do.jpg',        TRUE, NOW(), NOW()),
  ('Cà tím',        12, 'kg',   25, 20000, '/public/ingredients/ca_tim.jpg',       FALSE, NOW(), NOW()),
  ('Khổ qua',       12, 'quả',  17, 8000,  '/public/ingredients/kho_qua.jpg',      FALSE, NOW(), NOW());

-- Nấm (categoryId: 13)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Nấm rơm',       13, 'kg',   22, 40000, '/public/ingredients/nam_rom.jpg',      FALSE, NOW(), NOW()),
  ('Nấm hương',     13, 'gram', 28, 8000,  '/public/ingredients/nam_huong.jpg',    FALSE, NOW(), NOW()),
  ('Nấm kim châm',  13, 'gói',  37, 15000, '/public/ingredients/nam_kim_cham.jpg', FALSE, NOW(), NOW());

-- Thịt heo (categoryId: 14)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Thịt ba chỉ',   14, 'gram', 518, 75000, '/public/ingredients/ba_chi.jpg',      TRUE, NOW(), NOW()),
  ('Thịt nạc vai',  14, 'gram', 143, 65000, '/public/ingredients/nac_vai.jpg',     TRUE, NOW(), NOW()),
  ('Sườn heo',      14, 'gram', 282, 90000, '/public/ingredients/suon_heo.jpg',    TRUE, NOW(), NOW()),
  ('Chân giò heo',  14, 'gram', 210, 55000, '/public/ingredients/chan_gio.jpg',    FALSE, NOW(), NOW()),
  ('Xương heo',     14, 'gram', 130, 35000, '/public/ingredients/xuong_heo.jpg',   TRUE, NOW(), NOW());

-- Thịt bò (categoryId: 15)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Thịt bò xào',   15, 'gram', 250, 150000, '/public/ingredients/bo_xao.jpg',     FALSE, NOW(), NOW()),
  ('Bắp bò',        15, 'gram', 180, 120000, '/public/ingredients/bap_bo.jpg',     FALSE, NOW(), NOW()),
  ('Xương bò',      15, 'gram', 140, 60000,  '/public/ingredients/xuong_bo.jpg',   FALSE, NOW(), NOW());

-- Thịt gà (categoryId: 16)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Đùi gà',        16, 'gram', 209, 65000, '/public/ingredients/dui_ga.jpg',      TRUE, NOW(), NOW()),
  ('Ức gà',         16, 'gram', 165, 70000, '/public/ingredients/uc_ga.jpg',       TRUE, NOW(), NOW()),
  ('Gà nguyên con', 16, 'con',  215, 150000,'/public/ingredients/ga_nguyen.jpg',   TRUE, NOW(), NOW()),
  ('Cánh gà',       16, 'gram', 222, 60000, '/public/ingredients/canh_ga.jpg',     TRUE, NOW(), NOW());

-- Cá (categoryId: 17)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Cá basa',       17, 'gram', 92,  60000, '/public/ingredients/ca_basa.jpg',     TRUE, NOW(), NOW()),
  ('Cá thu',        17, 'gram', 139, 80000, '/public/ingredients/ca_thu.jpg',      FALSE, NOW(), NOW()),
  ('Cá lóc',        17, 'gram', 102, 90000, '/public/ingredients/ca_loc.jpg',      FALSE, NOW(), NOW()),
  ('Cá hồi',        17, 'gram', 206, 200000,'/public/ingredients/ca_hoi.jpg',      FALSE, NOW(), NOW());

-- Tôm & Cua (categoryId: 18)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Tôm sú',        18, 'gram', 99,  150000, '/public/ingredients/tom_su.jpg',     FALSE, NOW(), NOW()),
  ('Tôm thẻ',       18, 'gram', 85,  100000, '/public/ingredients/tom_the.jpg',    FALSE, NOW(), NOW()),
  ('Mực',           18, 'gram', 92,  120000, '/public/ingredients/muc.jpg',        FALSE, NOW(), NOW());

-- Trứng & Sữa (categoryId: 4)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Trứng gà',      4,  'quả',  143, 4000,  '/public/ingredients/trung_ga.jpg',    TRUE, NOW(), NOW()),
  ('Trứng vịt',     4,  'quả',  185, 5000,  '/public/ingredients/trung_vit.jpg',   FALSE, NOW(), NOW()),
  ('Sữa tươi',      4,  'ml',   61,  35000, '/public/ingredients/sua_tuoi.jpg',    FALSE, NOW(), NOW());

-- Gia vị cơ bản (categoryId: 5)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Muối',          5,  'gram', 0,   5000,  '/public/ingredients/muoi.jpg',        TRUE, NOW(), NOW()),
  ('Đường',         5,  'gram', 387, 20000, '/public/ingredients/duong.jpg',       TRUE, NOW(), NOW()),
  ('Tiêu đen',      5,  'gram', 251, 15000, '/public/ingredients/tieu.jpg',        TRUE, NOW(), NOW()),
  ('Dầu ăn',        5,  'ml',   884, 30000, '/public/ingredients/dau_an.jpg',      TRUE, NOW(), NOW()),
  ('Bột ngọt',      5,  'gram', 0,   10000, '/public/ingredients/bot_ngot.jpg',    TRUE, NOW(), NOW());

-- Nước chấm & Sốt (categoryId: 9)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Nước mắm',      9,  'ml',   35,  25000, '/public/ingredients/nuoc_mam.jpg',    TRUE, NOW(), NOW()),
  ('Xì dầu',        9,  'ml',   53,  20000, '/public/ingredients/xi_dau.jpg',      TRUE, NOW(), NOW()),
  ('Tương ớt',      9,  'ml',   90,  15000, '/public/ingredients/tuong_ot.jpg',    TRUE, NOW(), NOW()),
  ('Dấm',           9,  'ml',   18,  10000, '/public/ingredients/dam.jpg',         TRUE, NOW(), NOW());

-- Ngũ cốc & Bột (categoryId: 6)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Gạo tẻ',        6,  'gram', 365, 18000, '/public/ingredients/gao_te.jpg',      TRUE, NOW(), NOW()),
  ('Bún tươi',      6,  'gram', 109, 10000, '/public/ingredients/bun_tuoi.jpg',    TRUE, NOW(), NOW()),
  ('Mì spaghetti',  6,  'gram', 371, 25000, '/public/ingredients/mi_spaghetti.jpg',FALSE, NOW(), NOW()),
  ('Bột mì',        6,  'gram', 364, 15000, '/public/ingredients/bot_mi.jpg',      FALSE, NOW(), NOW());

-- Đậu & Hạt (categoryId: 10)
INSERT INTO `ingredients` (`name`, `categoryId`, `defaultUnit`, `caloriesPer100g`, `averagePricePerUnit`, `imagePath`, `isCommon`, `createdAt`, `updatedAt`) VALUES
  ('Đậu phụ',       10, 'miếng',76,  8000,  '/public/ingredients/dau_phu.jpg',     TRUE, NOW(), NOW()),
  ('Đậu đen',       10, 'gram', 339, 25000, '/public/ingredients/dau_den.jpg',     FALSE, NOW(), NOW()),
  ('Lạc rang',      10, 'gram', 567, 30000, '/public/ingredients/lac_rang.jpg',    FALSE, NOW(), NOW());

-- ============================================================
-- [4] TAGS (~20 tags phân loại công thức)
-- ============================================================
INSERT INTO `tags` (`name`, `type`, `createdAt`) VALUES
  -- Cuisine (ẩm thực vùng miền)
  ('Món Bắc',           'cuisine',   NOW()),
  ('Món Nam',           'cuisine',   NOW()),
  ('Món Trung',         'cuisine',   NOW()),
  ('Món Hàn',           'cuisine',   NOW()),
  ('Món Nhật',          'cuisine',   NOW()),
  ('Món Tây',           'cuisine',   NOW()),

  -- Dietary (chế độ ăn)
  ('Chay thuần',        'dietary',   NOW()),
  ('Ít calo',           'dietary',   NOW()),
  ('Giàu đạm',          'dietary',   NOW()),
  ('Không gluten',      'dietary',   NOW()),
  ('Phù hợp giảm cân',  'dietary',   NOW()),

  -- Technique (kỹ thuật nấu)
  ('Xào nhanh',         'technique', NOW()),
  ('Hấp',               'technique', NOW()),
  ('Luộc',              'technique', NOW()),
  ('Chiên',             'technique', NOW()),
  ('Kho',               'technique', NOW()),
  ('Nướng',             'technique', NOW()),
  ('Nấu canh',          'technique', NOW()),

  -- Occasion (dịp)
  ('Bữa sáng nhanh',    'occasion',  NOW()),
  ('Cơm gia đình',      'occasion',  NOW()),
  ('Tiệc cuối tuần',    'occasion',  NOW()),
  ('Dã ngoại',          'occasion',  NOW());

-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'roles'                   AS `table`, COUNT(*) AS count FROM `roles`
UNION ALL
SELECT 'ingredient_categories',  COUNT(*) FROM `ingredient_categories`
UNION ALL
SELECT 'ingredients',            COUNT(*) FROM `ingredients`
UNION ALL
SELECT 'tags',                   COUNT(*) FROM `tags`;
