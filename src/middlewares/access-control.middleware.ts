import { UserRole } from "../lib/prisma.ts";
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import env from "../config/env.ts";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.ts";

export function checkRoles(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // On récupère le token d'accès depuis le cookie ou l'en-tête Authorization.
    const token = extractAccessToken(req);
    // Si le token est valide, on récupère l'identité et le rôle de l'utilisateur.
    const { id, role } = verifyAndDecodeJWT(token);
    // Le middleware bloque l'accès si le rôle courant n'appartient pas aux rôles autorisés.
    if (!roles.includes(role))
      throw new ForbiddenError(`Permission denied for role ${role}`);

    // On enrichit la requête avec les infos d'identification utiles aux handlers suivants.
    req.user = { id, role };
    next();
  };
}

function extractAccessToken(req: Request): string {
  // Le token peut arriver via le cookie de session ou via un header Bearer.
  if (typeof req.cookies?.accessToken === "string") {
    return req.cookies.accessToken;
  }

  // Sans token exploitable, on renvoie une erreur d'authentification.
  throw new UnauthorizedError("Access token not provided");
}

function verifyAndDecodeJWT(accessToken: string): JwtPayload {
  try {
    // La signature est vérifiée avec le secret de l'application avant d'utiliser le contenu.
    const payload = jwt.verify(accessToken, env.jwtSecret) as JwtPayload;
    return payload;
  } catch (error) {
    // Toute erreur de vérification est traitée comme un token invalide ou expiré.
    console.error(error);
    throw new UnauthorizedError("Invalid or expired access token");
  }
}
