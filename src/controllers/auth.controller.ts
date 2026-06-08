import type { Request, Response } from "express";
import argon2 from "argon2";
import { Prisma, prisma } from "../lib/prisma";
import {
  loginUserBodySchema,
  registerUserBodySchema,
  resetPasswordBodySchema,
  updateUserBodySchema,
} from "../schemas/auth.schemas";
import {
  generateTokens,
  replaceRefreshTokenInDatabase,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../lib/tokens";
import { UnauthorizedError } from "../lib/errors";
import type { SafeUserResponse } from "../lib/interface";

const controller = {
  async registerUser(req: Request, res: Response): Promise<void> {
    const { username, email, password, country, bio, profilePicture } =
      await registerUserBodySchema.parseAsync(req.body);

    const passwordHash = await argon2.hash(password);

    await prisma.user.create({
      data: {
        username,
        email,
        country: country ?? null,
        bio: bio ?? null,
        profilePicture: profilePicture ?? null,
        password: passwordHash,
      },
    });

    res.status(201).json({ message: "Compte créé avec succès" });
  },

  async loginUser(req: Request, res: Response): Promise<void> {
    const { email, password } = await loginUserBodySchema.parseAsync(req.body);

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) throw new UnauthorizedError("Email and password do not match");

    const isMatching = await argon2.verify(user.password, password);

    if (!isMatching) {
      throw new UnauthorizedError("Email and password do not match");
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await replaceRefreshTokenInDatabase(refreshToken, user);
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);
    res.status(204).end();
  },

  async refreshTokens(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refreshToken;

    if (!token) throw new UnauthorizedError("Refresh token not provided");

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
    const { currentPassword, newPassword } = await resetPasswordBodySchema.parseAsync(req.body);

    const connectedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.user.id,
      },
    });

    const isMatching = await argon2.verify(connectedUser.password, currentPassword);

    if (!isMatching) throw new UnauthorizedError("The current password is not matching.");

    const newPasswordHashed = await argon2.hash(newPassword);

    await prisma.user.update({
      where: { id: connectedUser.id },
      data: { password: newPasswordHashed },
    });

    res.status(200).json({ message: "Password successfully updated." });
  },

  async logoutUser(req: Request, res: Response): Promise<void> {
    await prisma.refreshToken.delete({ where: { userId: req.user.id } });
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.status(204).end();
  },

  async getConnectedUser(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });

    res.status(200).json({
      userWithoutPassword: {
        username: user.username,
        email: user.email,
        country: user.country,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role,
        visibility: user.visibility,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        id: user.id,
      } satisfies SafeUserResponse,
    });
  },

  // RGPD — droit de rectification
  async updateUser(req: Request, res: Response): Promise<void> {
    const body = await updateUserBodySchema.parseAsync(req.body);

    // Le type inféré par Zod ne correspond pas exactement à UserUpdateInput de Prisma,
    // mais le schema garantit que seuls des champs autorisés sont présents.
    const data = body as Prisma.UserUncheckedUpdateInput;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    res.status(200).json({
      userWithoutPassword: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        country: updatedUser.country,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        role: updatedUser.role,
        visibility: updatedUser.visibility,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      } satisfies SafeUserResponse,
    });
  },

  // RGPD — droit à la portabilité : retourne toutes les données personnelles sans le mot de passe
  async exportUser(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        country: true,
        bio: true,
        profilePicture: true,
        role: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        challenges: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
        participations: {
          select: {
            id: true,
            title: true,
            slug: true,
            video: true,
            status: true,
            createdAt: true,
          },
        },
        challengeVotes: {
          select: { challengeId: true, createdAt: true },
        },
        participationVotes: {
          select: { participationId: true, createdAt: true },
        },
        favoriteChallenges: {
          select: { challengeId: true, createdAt: true },
        },
      },
    });

    // Déclenche le téléchargement du fichier côté client à l'appel de la route
    res
      .setHeader("Content-Disposition", `attachment; filename="export-${user.username}.json"`)
      .status(200)
      .json(user);
  },

  // RGPD — droit à l'effacement
  async deleteUser(req: Request, res: Response): Promise<void> {
    const userId = req.user.id;

    // Challenge a onDelete: Restrict sur User — il faut supprimer les challenges en premier.
    // La transaction garantit qu'aucune suppression partielle n'est possible en cas d'erreur.
    await prisma.$transaction([
      prisma.challenge.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.status(204).end();
  },
};

export default controller;
