import type { Response } from "express";
import { prisma, type User } from "../lib/prisma";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { randomBytes } from "node:crypto";
import type { GeneratedTokens, Token } from "./interface";

const isProduction = env.nodeEnv === "production";

export function generateTokens(user: User): GeneratedTokens {
  const payload = {
    id: user.id,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
  const refreshToken = randomBytes(64).toString("hex");

  return {
    accessToken: {
      token: accessToken,
      expiresInMS: 15 * 60 * 1000,
    },
    refreshToken: {
      token: refreshToken,
      expiresInMS: 7 * 24 * 60 * 60 * 1000,
    },
  };
}

const baseCookieOptions = {
  httpOnly: true,

  secure: isProduction,

  sameSite: "lax" as const,
};

export function setAccessTokenCookie(res: Response, accessToken: Token) {
  res.cookie("accessToken", accessToken.token, {
    ...baseCookieOptions,
    maxAge: accessToken.expiresInMS,
  });
}

export function setRefreshTokenCookie(res: Response, refreshToken: Token) {
  res.cookie("refreshToken", refreshToken.token, {
    ...baseCookieOptions,
    maxAge: refreshToken.expiresInMS,
    path: "/api/auth/refresh",
  });
}

export async function replaceRefreshTokenInDatabase(
  refreshToken: Token,
  user: User
): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken.token,
      userId: user.id,
      issuedAt: new Date(),
      expiresAt: new Date(new Date().valueOf() + refreshToken.expiresInMS),
    },
  });
}
