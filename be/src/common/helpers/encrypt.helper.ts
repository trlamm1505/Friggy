import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ENCRYPTION_SECRET } from '../constant/app.constant';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Derive 32-byte key từ ENCRYPTION_SECRET bằng scrypt
 */
const getKey = (): Buffer =>
  scryptSync(ENCRYPTION_SECRET, 'friggy_salt', 32) as Buffer;

/**
 * Mã hóa plain text → chuỗi hex `iv:encrypted`
 * Dùng để lưu AI API key vào DB
 */
export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  // Format: "<iv_hex>:<encrypted_hex>"
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Giải mã chuỗi `iv:encrypted` → plain text
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Định dạng encrypted text không hợp lệ');
  }
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
