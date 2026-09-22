import * as bcrypt from 'bcryptjs';

const OTP_LENGTH = 6;
const BCRYPT_ROUNDS = 10;

/**
 * Sinh mã OTP ngẫu nhiên gồm OTP_LENGTH chữ số
 */
export function generateOtp(): string {
  const max = Math.pow(10, OTP_LENGTH);
  const otp = Math.floor(Math.random() * max);
  // Đảm bảo luôn đủ OTP_LENGTH ký tự (padStart với '0')
  return otp.toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hash OTP bằng bcrypt trước khi lưu DB
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

/**
 * So sánh OTP người dùng nhập với hash trong DB
 */
export async function verifyOtp(
  plainOtp: string,
  hashedOtp: string,
): Promise<boolean> {
  return bcrypt.compare(plainOtp, hashedOtp);
}

/**
 * Hash refresh token trước khi lưu DB
 * (Dùng bcrypt với số vòng thấp hơn vì token dài hơn)
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 8);
}

/**
 * Verify refresh token với hash trong DB
 */
export async function verifyToken(
  plainToken: string,
  hashedToken: string,
): Promise<boolean> {
  return bcrypt.compare(plainToken, hashedToken);
}
