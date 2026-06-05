import { UserRole } from "../lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import env from "../config/env.ts";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.ts";

export function checkRoles(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractAccessToken(req);

    const { id, role } = verifyAndDecodeJWT(token);

    if (!roles.includes(role)) throw new ForbiddenError(`Permission denied for role ${role}`);

    req.user = { id, role };
    next();
  };
}

function extractAccessToken(req: Request): string {
  if (typeof req.cookies?.accessToken === "string") {
    return req.cookies.accessToken;
  }

  throw new UnauthorizedError("Access token not provided");
}

function verifyAndDecodeJWT(accessToken: string): JwtPayload {
  try {
    const payload = jwt.verify(accessToken, env.jwtSecret) as JwtPayload;
    return payload;
  } catch (error) {
    console.error(error);
    throw new UnauthorizedError("Invalid or expired access token");
  }
}
