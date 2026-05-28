import type { Response } from "express";
import type { User } from "../lib/prisma";
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
  // Protection xss (=> évite le document.cookie en JS)
  httpOnly: true,
  // secure === true => le cookie n'est envoyé qu'en https sauf localhost
  secure: isProduction,
  // sameSite = Lax => les cookies ne sont pas envoyés sur les sous-requêtes cross-site normales (par exemple pour charger des images ou des frames dans un site tiers), mais sont envoyés quand un utilisateur navigue vers le site d'origine (c'est-à-dire en suivant un lien)
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
