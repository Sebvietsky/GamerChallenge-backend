import type { PaginationOutput } from "../lib/interface";

export function getPaginationParams(page?: number, limit?: number): PaginationOutput {
  const currentPage: number = page ?? 1;
  const currentLimit: number = limit ?? 20;
  return {
    skip: (currentPage - 1) * currentLimit,
    take: currentLimit,
    page: currentPage,
    limit: currentLimit,
  };
}
