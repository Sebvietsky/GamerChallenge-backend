import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";
import {
  loginUserBodySchema,
  registerUserBodySchema,
  resetPasswordBodySchema,
} from "../schemas/auth.schemas";
import {
  generateTokens,
  replaceRefreshTokenInDatabase,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../lib/tokens";
import { UnauthorizedError, ConflictError, NotFoundError } from "../lib/errors";

/**
 * Authentication controller handling user-related actions
 */

const controller = {
  /**
   * Handles user registration
   * @param req - Express request object
   * @param res - Express response object
   */
  async registerUser(req: Request, res: Response): Promise<void> {
    // Validate and parse request body
    const { username, email, password, country, bio, profilePicture } =
      await registerUserBodySchema.parseAsync(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      throw new ConflictError("Username or email already used");
    }

    // Hash password before saving
    const passwordHash = await argon2.hash(password);

    // Create the new user in the database
    const user = await prisma.user.create({
      data: {
        username,
        email,
        country: country ?? null,
        bio: bio ?? null,
        profilePicture: profilePicture ?? null,
        password: passwordHash,
      },
    });

    // Return created user (excluding password)
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      country: user.country,
      bio: user.bio,
      profilePicture: user.profilePicture,
    });
  },

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
    await replaceRefreshTokenInDatabase(refreshToken, user);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ accessToken, refreshToken });
  },

  async refreshTokens(req: Request, res: Response): Promise<void> {
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
    await replaceRefreshTokenInDatabase(refreshToken, existingToken.user);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    res.json({ accessToken, refreshToken });
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } =
      await resetPasswordBodySchema.parseAsync(req.body);

    const connectedUser = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
    });

    if (!connectedUser) throw new NotFoundError("User not found.");

    const isMatching = await argon2.verify(
      connectedUser.password,
      currentPassword,
    );

    if (!isMatching)
      throw new UnauthorizedError("The current password is not matching.");

    const newPasswordHashed = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: connectedUser.id },
      data: { password: newPasswordHashed },
    });

    res.status(200).send({ message: "Password successfully updated." });
  },

  async logoutUser(req: Request, res: Response): Promise<void> {
    await prisma.refreshToken.delete({ where: { userId: req.user.id } });
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.status(204).end();
  },
};

export default controller;
