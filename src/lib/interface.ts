import type { UserRole, UserStatus } from "./prisma";

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

export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: { url: string };
  platforms?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  involved_companies?: Array<{
    developer: boolean;
    company: { name: string };
  }>;
}

export interface SafeUserResponse {
  createdAt: Date;
  id: number;
  status: UserStatus;
  visibility: boolean;
  updatedAt: Date;
  username: string;
  email: string;
  country: string | null;
  bio: string | null;
  profilePicture: string | null;
  role: UserRole;
}
export interface UserReponse {
  id: number;
  username: string;
  country: string | null;
  profilePicture: string | null;
}

export interface MostActivUserResponse extends UserReponse {
  participationCount: number;
  challengeCount: number;
  totalActivity: number;
}
