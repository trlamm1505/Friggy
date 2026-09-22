/**
 * Hằng số ứng dụng AI Service
 * Đọc từ biến môi trường — KHÔNG đọc process.env trực tiếp ở các module khác
 */
import 'dotenv/config';
// ─── Database ────────────────────────────────────────────────────────────────
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'mysql://root:1234@localhost:3309/Friggy';

// ─── Redis ────────────────────────────────────────────────────────────────────
export const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';

// ─── RabbitMQ ────────────────────────────────────────────────────────────────
export const RABBIT_MQ_URL =
  process.env.RABBIT_MQ_URL ?? 'amqp://user:12345@localhost:5673';

// ─── RabbitMQ Exchange & Routing Keys ────────────────────────────────────────
export const FRIGGY_AI_EXCHANGE = 'friggy.ai';

// Routing keys — Main BE publish, AI Service consume
export const MEAL_PLAN_ROUTING_KEY = 'meal.plan.generate';
export const AI_CHAT_ROUTING_KEY = 'ai.chat.message';
export const FRIDGE_SCAN_ROUTING_KEY = 'fridge.scan';
export const AI_SLOT_REGENERATE_ROUTING_KEY = 'ai.slot.regenerate';
export const AI_EXPIRING_MEAL_ROUTING_KEY = 'ai.expiring.meal.plan';
export const PUBLIC_CHAT_ROUTING_KEY = 'public.chat.message';

// Queue names — AI Service khai báo
export const MEAL_PLAN_QUEUE_NAME = 'meal-plan-generate-queue';
export const AI_CHAT_QUEUE_NAME = 'ai-chat-message-queue';
export const FRIDGE_SCAN_QUEUE_NAME = 'fridge-scan-queue';
export const AI_SLOT_REGENERATE_QUEUE_NAME = 'ai-slot-regenerate-queue';
export const AI_EXPIRING_MEAL_QUEUE_NAME = 'ai-expiring-meal-queue';
export const PUBLIC_CHAT_QUEUE_NAME = 'public-chat-queue';

// ─── AI Encryption ───────────────────────────────────────────────────────────
// Phải khớp với ENCRYPTION_SECRET trong be/.env
export const AI_KEY_ENCRYPTION_SECRET =
  process.env.AI_KEY_ENCRYPTION_SECRET ?? '';

// ─── Server ───────────────────────────────────────────────────────────────────
export const PORT = parseInt(process.env.PORT ?? '6970', 10);
