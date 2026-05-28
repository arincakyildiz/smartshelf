import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  isPaginated: boolean;
}

/**
 * Parse pagination from query params.
 * If neither `page` nor `limit` present → returns isPaginated=false (legacy mode → caller returns array)
 * Otherwise returns sanitized page/limit/skip values.
 */
export function parsePagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationParams {
  const hasPage = typeof req.query.page === 'string';
  const hasLimit = typeof req.query.limit === 'string';

  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    isPaginated: hasPage || hasLimit,
  };
}

export interface SortParams {
  sort_by: string;
  sort_dir: 1 | -1;
}

export function parseSort(req: Request, defaultField = 'created_at', defaultDir: 'asc' | 'desc' = 'desc'): SortParams {
  const sort_by = (req.query.sort_by as string) || defaultField;
  const sort_dir = ((req.query.sort_dir as string) || defaultDir) === 'asc' ? 1 : -1;
  return { sort_by, sort_dir };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function paginated<T>(items: T[], total: number, p: PaginationParams): PaginatedResponse<T> {
  return {
    items,
    total,
    page: p.page,
    limit: p.limit,
    total_pages: Math.ceil(total / p.limit),
  };
}
