import type { PaginatedResponse } from '../movies/movie.types.js';

export function buildPaginatedResponse<T>(
  items: T[],
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const data = items.slice(0, limit);

  return {
    data,
    pagination: {
      limit,
      offset,
      count: data.length,
      hasMore: items.length > limit,
    },
  };
}
