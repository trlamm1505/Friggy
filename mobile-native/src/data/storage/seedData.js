/**
 * Seed Data Helper
 *
 * Khi app lần đầu chạy, kiểm tra nếu SQLite rỗng thì import dữ liệu
 * từ mock JSON. Sau này sẽ thay bằng sync từ API.
 */

import databaseService from './DatabaseService';
import userMock from '../../shared/mocks/user.json';
import inventoryMock from '../../shared/mocks/inventory.json';
import summaryMock from '../../shared/mocks/fridge-summary.json';
import preferencesMock from '../../shared/mocks/user-preferences.json';
import allergiesMock from '../../shared/mocks/allergies.json';
import familyMock from '../../shared/mocks/family-members.json';
import notificationsMock from '../../shared/mocks/notifications.json';
import shoppingMock from '../../shared/mocks/shopping-reminder.json';
import weeklyStatsMock from '../../shared/mocks/weekly-stats.json';

/**
 * Check xem database đã có data chưa
 */
const isTableEmpty = async (table) => {
  const result = await databaseService.queryOne(`SELECT COUNT(*) as count FROM ${table}`);
  return result.count === 0;
};

const safeJsonStringify = (obj) => JSON.stringify(obj);

/**
 * Seed users
 */
const seedUsers = async () => {
  if (!(await isTableEmpty('users'))) return;
  await databaseService.insert('users', {
    id: userMock.id,
    name: userMock.name,
    email: userMock.email,
    phone: userMock.phone || null,
    avatar: userMock.avatar || null,
    birthday: null,
    gender: null,
    bio: null,
    join_date: userMock.joinDate,
    is_family_plan: userMock.isFamilyPlan ? 1 : 0,
  });
};

/**
 * Seed fridge items
 */
const seedFridgeItems = async () => {
  if (!(await isTableEmpty('fridge_items'))) return;
  for (const item of inventoryMock.items) {
    await databaseService.insert('fridge_items', {
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiry_date: item.expiryDate,
      status: item.status,
      image: item.image || null,
      compartment: 'fridge',
    });
  }
};

/**
 * Seed fridge stats
 */
const seedFridgeStats = async () => {
  if (!(await isTableEmpty('fridge_stats'))) return;
  await databaseService.insert('fridge_stats', {
    id: 1,
    expired_count: summaryMock.expiredCount,
    available_count: summaryMock.availableCount,
  });
};

/**
 * Seed user preferences
 *
 * Shape phải khớp `user-preferences.json` — file này đã đổi sang 13 field BE
 * (`dietaryStyle`, `skillLevel`, `weeklyBudget`...) ở Sprint A2. Đọc tên field cũ
 * (`diet`/`spice_level`/`cooking_time`/`servings`) sẽ ghi `undefined` xuống SQLite.
 *
 * Bảng `user_preferences` vẫn giữ cột cũ: `seedAll()` chỉ chạy khi USE_MOCKS=true
 * (P0.6 / mục 8b) và đây là dữ liệu mẫu cho chế độ mock, không phải nguồn thật.
 */
const seedPreferences = async () => {
  if (!(await isTableEmpty('user_preferences'))) return;
  const p = preferencesMock.preferences;
  await databaseService.insert('user_preferences', {
    id: 1,
    // Cột cũ giữ tên để không phải migrate schema (ngoài phạm vi A2).
    // `diet` <- `dietaryStyle`, `servings` <- `householdSize` (ý nghĩa gần nhất).
    diet: p.dietaryStyle ?? null,
    spice_level: p.activityLevel ?? null,
    cooking_time: p.maxCookTimeMinutes ?? null,
    servings: p.householdSize ?? 1,
  });
};

/**
 * Seed allergies
 *
 * `allergies.json` đã đổi sang shape BE ở Sprint A2: có `ingredientId` + `note`,
 * KHÔNG còn `severity` (BE `AllergyResponseDto` không có field này).
 * Cột `severity` trong bảng SQLite giữ lại NULL cho khớp DDL.
 */
const seedAllergies = async () => {
  if (!(await isTableEmpty('allergies'))) return;
  for (const a of allergiesMock.allergies) {
    await databaseService.insert('allergies', {
      id: a.id,
      name: a.name,
      severity: null,
    });
  }
};

/**
 * Seed family members
 */
const seedFamily = async () => {
  if (!(await isTableEmpty('family_members'))) return;
  for (const m of familyMock.members) {
    await databaseService.insert('family_members', {
      id: m.id,
      name: m.name,
      role: m.role,
      avatar: m.avatar || null,
    });
  }
};

/**
 * Seed notifications
 */
const seedNotifications = async () => {
  if (!(await isTableEmpty('notifications'))) return;
  for (const n of notificationsMock.notifications) {
    await databaseService.insert('notifications', {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: n.time,
      read: n.read ? 1 : 0,
    });
  }
};

/**
 * Seed shopping items
 */
const seedShopping = async () => {
  if (!(await isTableEmpty('shopping_items'))) return;
  for (const item of shoppingMock.items) {
    await databaseService.insert('shopping_items', {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      done: item.done ? 1 : 0,
    });
  }
};

/**
 * Seed weekly stats
 */
const seedWeeklyStats = async () => {
  if (!(await isTableEmpty('weekly_stats'))) return;
  await databaseService.insert('weekly_stats', {
    id: 1,
    week_data: safeJsonStringify({
      week: weeklyStatsMock.week,
      data: weeklyStatsMock.data,
    }),
    total: weeklyStatsMock.total,
    previous_week: weeklyStatsMock.previousWeek,
  });
};

/**
 * Seed tất cả dữ liệu mock vào SQLite.
 * Idempotent - chỉ seed khi table rỗng.
 */
export const seedAll = async () => {
  await databaseService.init();
  await Promise.all([
    seedUsers(),
    seedFridgeItems(),
    seedFridgeStats(),
    seedPreferences(),
    seedAllergies(),
    seedFamily(),
    seedNotifications(),
    seedShopping(),
    seedWeeklyStats(),
  ]);
  if (__DEV__) {
    console.log('[Seed] Mock data đã được import vào SQLite (nếu DB rỗng)');
  }
};
