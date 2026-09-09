import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy user hiện tại từ JWT payload đã được JwtAuthGuard xác thực.
 *
 * Dùng trong controller:
 * ```ts
 * @Get('/me')
 * getMe(@CurrentUser() user: JwtPayload) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
