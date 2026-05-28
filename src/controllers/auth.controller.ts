import type { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.ts";
import { registerUserBodySchema } from "../schemas/auth.schemas.ts";
import { ConflictError } from "../lib/errors.ts";

/**
 * Authentication controller handling user-related actions
 */
const controller = {
  /**
   * Handles user registration
   * @param req - Express request object
   * @param res - Express response object
   */
  async registerUser(req: Request, res: Response) {
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
};

export default controller;
