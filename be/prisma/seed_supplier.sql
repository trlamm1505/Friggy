-- ============================================================
-- seed_supplier.sql
-- Seed dữ liệu cho tính năng Food Supplier
-- Chạy SAU KHI migration add_food_supplier_feature đã hoàn tất
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Thêm role food_supplier vào bảng roles
-- ─────────────────────────────────────────────────────────────
INSERT INTO `roles` (`name`, `description`, `createdAt`)
VALUES ('food_supplier', 'Nhà cung cấp thực phẩm bên thứ 3 (đã mua gói cước)', NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ─────────────────────────────────────────────────────────────
-- 2. Tạo các gói cước SupplierPlan
-- ─────────────────────────────────────────────────────────────
INSERT INTO `supplier_plans` (`name`, `displayName`, `priceVnd`, `billingCycle`, `maxIngredients`, `features`, `isActive`, `createdAt`)
VALUES
  (
    'supplier_basic',
    'Gói Nhà Cung Cấp Cơ Bản',
    299000,
    'monthly',
    50,
    JSON_ARRAY(
      'Thêm tối đa 50 nguyên liệu',
      'Hiển thị ưu tiên khi người dùng lập kế hoạch ăn',
      'Hỗ trợ import Excel',
      'Dashboard theo dõi nguyên liệu'
    ),
    1,
    NOW()
  ),
  (
    'supplier_premium',
    'Gói Nhà Cung Cấp Cao Cấp',
    599000,
    'monthly',
    200,
    JSON_ARRAY(
      'Thêm tối đa 200 nguyên liệu',
      'Hiển thị ưu tiên cao nhất trong meal plan',
      'Hỗ trợ import Excel không giới hạn',
      'Dashboard analytics chi tiết',
      'Badge "Nhà cung cấp được xác minh"',
      'Hỗ trợ 24/7'
    ),
    1,
    NOW()
  ),
  (
    'supplier_basic_yearly',
    'Gói Nhà Cung Cấp Cơ Bản (Năm)',
    2990000,
    'yearly',
    50,
    JSON_ARRAY(
      'Thêm tối đa 50 nguyên liệu',
      'Hiển thị ưu tiên khi người dùng lập kế hoạch ăn',
      'Hỗ trợ import Excel',
      'Dashboard theo dõi nguyên liệu',
      'Tiết kiệm 17% so với gói tháng'
    ),
    1,
    NOW()
  ),
  (
    'supplier_premium_yearly',
    'Gói Nhà Cung Cấp Cao Cấp (Năm)',
    5990000,
    'yearly',
    200,
    JSON_ARRAY(
      'Thêm tối đa 200 nguyên liệu',
      'Hiển thị ưu tiên cao nhất trong meal plan',
      'Hỗ trợ import Excel không giới hạn',
      'Dashboard analytics chi tiết',
      'Badge "Nhà cung cấp được xác minh"',
      'Hỗ trợ 24/7',
      'Tiết kiệm 17% so với gói tháng'
    ),
    1,
    NOW()
  )
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);

-- ─────────────────────────────────────────────────────────────
-- 3. Thêm vào CronJobConfig — cron jobs mới cho supplier
-- ─────────────────────────────────────────────────────────────
INSERT INTO `cron_job_configs` (`name`, `cronExpression`, `isEnabled`, `description`, `updatedAt`)
VALUES
  (
    'supplier.expiry.warning',
    '0 8 * * *',
    1,
    'Gửi thông báo cho supplier có gói sắp hết hạn trong 7 ngày (8h sáng mỗi ngày)',
    NOW()
  ),
  (
    'supplier.expiry.deactivate',
    '0 0 * * *',
    1,
    'Tự động hết hạn gói supplier và hạ role về user (nửa đêm mỗi ngày)',
    NOW()
  ),
  (
    'supplier.ingredient.cleanup',
    '0 1 * * *',
    1,
    'Ẩn (archived) nguyên liệu của supplier hết hạn gói (1h sáng mỗi ngày)',
    NOW()
  ),
  (
    'supplier.payment.expire',
    '*/15 * * * *',
    1,
    'Tự động expire giao dịch thanh toán supplier quá 15 phút (mỗi 15 phút)',
    NOW()
  )
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- ─────────────────────────────────────────────────────────────
-- 4. Thêm SystemConfig cho supplier
-- (dùng backtick vì `key` là reserved word trong MySQL)
-- ─────────────────────────────────────────────────────────────
INSERT INTO `system_configs` (`key`, `value`, `description`, `updatedAt`)
VALUES
  ('supplier.payment.expireMinutes',   '15',   'Thời gian hết hạn link thanh toán gói supplier (phút)', NOW()),
  ('supplier.ingredient.maxPerImport', '500',  'Số dòng tối đa trong 1 lần import Excel', NOW()),
  ('supplier.import.dailyLimit',       '5',    'Số lần import Excel tối đa mỗi ngày/supplier', NOW()),
  ('supplier.expiry.warningDays',      '7',    'Số ngày trước khi gói hết hạn thì gửi cảnh báo', NOW())
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- ─────────────────────────────────────────────────────────────
-- 5. Verify — kiểm tra dữ liệu đã được insert
-- ─────────────────────────────────────────────────────────────
SELECT 'roles' AS tbl, `name` AS val FROM `roles` WHERE `name` = 'food_supplier'
UNION ALL
SELECT 'supplier_plans', `name` FROM `supplier_plans`
UNION ALL
SELECT 'cron_job_configs', `name` FROM `cron_job_configs` WHERE `name` LIKE 'supplier.%'
UNION ALL
SELECT 'system_configs', `key` FROM `system_configs` WHERE `key` LIKE 'supplier.%';
