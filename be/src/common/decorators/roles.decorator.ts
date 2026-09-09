import { SetMetadata } from '@nestjs/common';

export type AppRole = 'admin' | 'user';

export const ROLES_KEY = 'roles';

/**
 * Decorator gán metadata role cho route.
 * Được đọc bởi RolesGuard để kiểm tra quyền.
 *
 * Dùng trong controller:
 * ```ts
 * @Roles('admin')
 * @Delete('/:id')
 * deleteUser() { ... }
 * ```
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
