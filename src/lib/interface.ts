import type { UserRole } from "./prisma";

export interface Token {
  token: string;
  expiresInMS: number;
}

export interface GeneratedTokens {
  accessToken: Token;
  refreshToken: Token;
}

export interface ReqUser {
  id: number;
  role: UserRole;
}

export interface PaginationOutput {
  skip: number;
  take: number;
  page: number;
  limit: number;
}
