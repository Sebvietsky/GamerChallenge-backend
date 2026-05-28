import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";
import { loginUserBodySchema } from "../schemas/auth.schemas";
import {
  generateTokens,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../lib/tokens";
import type { User } from "../lib/prisma";
import type { Token } from "../lib/interface";
import { UnauthorizedError } from "../lib/errors";

const controller = {
  async loginUser(req: Request, res: Response): Promise<void> {
    const { email, password } = await loginUserBodySchema.parseAsync(req.body);

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new UnauthorizedError("Email and password do not match");
    }

    const isMatching = await argon2.verify(user.password, password);

    if (!isMatching) {
      throw new UnauthorizedError("Email and password do not match");
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await this.replaceRefreshTokenInDatabase(refreshToken, user);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ accessToken, refreshToken });
  },

  async replaceRefreshTokenInDatabase(
    refreshToken: Token,
    user: User,
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
  },

  async refreshTokens(req: Request, res: Response) {
    const token = req.cookies?.refreshToken;

    if (!token) throw new UnauthorizedError("Refresh token not provided");
    // au choix, on peut récupérer l'id du propriétaire du token dans le payload ou dans la db
    const existingToken = await prisma.refreshToken.findFirst({
      where: { token },
      include: { user: true },
    });
    if (!existingToken) throw new UnauthorizedError("Invalid Refresh token");

    if (existingToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: existingToken.id } });
      throw new UnauthorizedError("Invalid Refresh token");
    }
    const { accessToken, refreshToken } = generateTokens(existingToken.user);
    await this.replaceRefreshTokenInDatabase(refreshToken, existingToken.user);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ accessToken, refreshToken });
  },
};

export default controller;
