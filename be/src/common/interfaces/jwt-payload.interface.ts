/**
 * Payload được nhúng vào JWT Access Token
 */
export interface JwtPayload {
  sub: string;      // userId (UUID)
  role: string;     // 'admin' | 'user'
  iat?: number;     // issued at (tự động gán bởi @nestjs/jwt)
  exp?: number;     // expiry (tự động gán bởi @nestjs/jwt)
}
