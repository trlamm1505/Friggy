-- ============================================================
-- Migration: Thêm freezer_shelf_life_days và pantry_shelf_life_days
-- vào ingredient_categories
-- Chạy lệnh này trên DB trước khi deploy code mới
-- ============================================================

ALTER TABLE ingredient_categories
  ADD COLUMN freezer_shelf_life_days INT NULL COMMENT 'Số ngày bảo quản ngăn đông (freezer). NULL = không phù hợp để đông lạnh',
  ADD COLUMN pantry_shelf_life_days  INT NULL COMMENT 'Số ngày bảo quản tủ bếp/nhiệt độ phòng (pantry). NULL = không phù hợp để ở nhiệt độ phòng';

-- ============================================================
-- Cập nhật dữ liệu cho 18 category hiện có
-- Quy ước: NULL = không phù hợp lưu ở vị trí đó
-- ============================================================

-- Level 1: Danh mục cha
UPDATE ingredient_categories SET
  freezer_shelf_life_days = 30,   -- rau củ đông được nhưng giảm chất lượng
  pantry_shelf_life_days  = 3     -- một số củ quả khô để được ngắn ngày
WHERE id = 1; -- Rau củ quả (fridge=7)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 180,  -- thịt đông được rất lâu
  pantry_shelf_life_days  = NULL  -- không nên để thịt tươi ở nhiệt độ phòng
WHERE id = 2; -- Thịt (fridge=3)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 90,   -- hải sản đông được 3 tháng
  pantry_shelf_life_days  = NULL  -- không nên để hải sản tươi ở phòng
WHERE id = 3; -- Hải sản (fridge=2)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 90,   -- trứng đông 3 tháng, sữa đông được
  pantry_shelf_life_days  = NULL  -- sữa tươi/trứng không nên để phòng lâu
WHERE id = 4; -- Trứng & Sữa (fridge=7)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = NULL, -- gia vị không cần đông
  pantry_shelf_life_days  = 180   -- gia vị khô để tủ bếp rất lâu
WHERE id = 5; -- Gia vị cơ bản (fridge=180)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 365,  -- ngũ cốc/bột đông giữ được lâu hơn
  pantry_shelf_life_days  = 180   -- ngũ cốc/bột khô để phòng được 6 tháng
WHERE id = 6; -- Ngũ cốc & Bột (fridge=180)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = NULL, -- đồ uống không đông
  pantry_shelf_life_days  = 7     -- đồ uống đóng hộp/chai để phòng ngắn
WHERE id = 7; -- Đồ uống (fridge=3)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = NULL, -- đồ khô không cần đông
  pantry_shelf_life_days  = 180   -- đồ khô đặc trưng là để tủ bếp
WHERE id = 8; -- Đồ khô (fridge=180)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = NULL, -- nước chấm/sốt không đông
  pantry_shelf_life_days  = 90    -- nước chấm đóng chai chưa mở để phòng được
WHERE id = 9; -- Nước chấm & Sốt (fridge=180)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 365,  -- đậu/hạt đông giữ lâu
  pantry_shelf_life_days  = 90    -- đậu/hạt khô để tủ bếp được 3 tháng
WHERE id = 10; -- Đậu & Hạt (fridge=90)

-- Level 2: Danh mục con
UPDATE ingredient_categories SET
  freezer_shelf_life_days = 30,
  pantry_shelf_life_days  = 1
WHERE id = 11; -- Rau lá xanh (fridge=5)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 30,
  pantry_shelf_life_days  = 5
WHERE id = 12; -- Củ & Quả (fridge=7)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 30,
  pantry_shelf_life_days  = NULL  -- nấm tươi không để phòng
WHERE id = 13; -- Nấm (fridge=5)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 180,
  pantry_shelf_life_days  = NULL
WHERE id = 14; -- Thịt heo (fridge=3)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 180,
  pantry_shelf_life_days  = NULL
WHERE id = 15; -- Thịt bò (fridge=3)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 270,  -- gà đông được 9 tháng (USDA standard)
  pantry_shelf_life_days  = NULL
WHERE id = 16; -- Thịt gà (fridge=3)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 90,
  pantry_shelf_life_days  = NULL
WHERE id = 17; -- Cá (fridge=2)

UPDATE ingredient_categories SET
  freezer_shelf_life_days = 90,
  pantry_shelf_life_days  = NULL
WHERE id = 18; -- Tôm & Cua (fridge=2)
