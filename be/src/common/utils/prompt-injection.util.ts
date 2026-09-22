/**
 * Prompt Injection Guard — Layer 1 (BE side)
 *
 * Phát hiện và chặn các pattern prompt injection phổ biến.
 * Được dùng chung cho AI Chat (JWT) và AI Public Chat.
 *
 * Layer 2 (ai-service side) có thể bổ sung thêm kiểm tra sâu hơn.
 */
import { BadRequestException } from '@nestjs/common';

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior|your)\s+instructions?/i,
  /forget\s+(everything|all|your\s+instructions?|your\s+rules?)/i,
  /disregard\s+(all\s+)?(previous|your)\s+instructions?/i,
  /override\s+(your|all)\s+(instructions?|constraints?|rules?|guidelines?)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(if\s+you\s+are|a\s+|an\s+)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /roleplay\s+as/i,
  /new\s+(role|persona|identity|instructions?|personality)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|rules?)/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /\[SYSTEM\]/i,
  /<\|system\|>/i,
];

/**
 * Kiểm tra input có chứa prompt injection không.
 * Throw BadRequestException nếu phát hiện injection.
 */
export function throwIfInjection(input: string): void {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new BadRequestException('Nội dung tin nhắn không hợp lệ');
    }
  }
}
