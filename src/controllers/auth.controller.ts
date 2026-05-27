import type { Request, Response } from "express";
import argon2 from "argon2";
import type { User } from "../lib/prisma.ts";
import { prisma } from "../lib/prisma.ts";
import { registerUserBodySchema } from "../schemas/auth.schemas.ts";
import { ConflictError } from "../lib/errors.ts";

/*
  id             Int        @id @default(autoincrement()) => Pas dans le body
  username       String     @unique @db.VarChar(50) => Dans le body
  email          String     @unique @db.VarChar(255) => Dans le body
  password       String     @db.VarChar(255) => Dans le body
  country        String?    @db.VarChar(50) => Dans le body
  bio            String?    @db.Text => Dans le body
  profilePicture String?    @map("profile_picture") @db.VarChar(255) => Dans le body
  role           UserRole   @default(user) => Pas dans le body
  visibility     Boolean    @default(true) => Pas dans le body
  status         UserStatus @default(active) => Pas dans le body
  createdAt      DateTime   @default(now()) @map("created_at") @db.Timestamptz() => Pas dans le body
  updatedAt      DateTime   @updatedAt @map("updated_at") @db.Timestamptz() => Pas dans le body
*/

const controller = {
  async registerUser(req: Request, res: Response) {
    const { username, email, password, country, bio, profilePicture } =
      await registerUserBodySchema.parseAsync(req.body);

    const existingUser = await prisma.user.findFirst({ where: { email } });

    if (existingUser) {
      throw new ConflictError("Email already used");
    }

    const passwordHash = await argon2.hash(password);

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
