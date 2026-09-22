import { PaginatedResult, PaginationMeta } from '../dto/pagination.dto';

/**
 * Tính toán skip và take cho Prisma query
 */
export function getPaginationParams(page = 1, limit = 20): {
  skip: number;
  take: number;
} {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Build meta object từ kết quả truy vấn
 */
export function buildPaginationMeta(
  total: number,
  page = 1,
  limit = 20,
): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}

/**
 * Wrapper tổng hợp: nhận items + total → trả về PaginatedResult chuẩn
 */
export function paginate<T>(
  items: T[],
  total: number,
  page = 1,
  limit = 20,
): PaginatedResult<T> {
  return {
    items,
    meta: buildPaginationMeta(total, page, limit),
  };
}
