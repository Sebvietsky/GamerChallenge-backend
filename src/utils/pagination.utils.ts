import type { PaginationOutput } from "../lib/interface";

export function getPaginationParams(page: number, limit: number): PaginationOutput {
  return {
    skip: (page - 1) * limit,
    take: limit,
    page: page,
    limit,
  };
}
