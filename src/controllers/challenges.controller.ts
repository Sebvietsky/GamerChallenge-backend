import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  PaginationOutputSchema,
  type PaginationParams,
} from "../schemas/query.schemas";
import { generateSlug, parseIdFromParams } from "./utils";
import { NotFoundError } from "../lib/errors";
import { createOneChallengeBodySchema } from "../schemas/controller.schemas";

const selectParams = {
  id: true,
  title: true,
  slug: true,
  closesAt: true,
  status: true,
  createdAt: true,
  game: {
    select: {
      name: true,
      studio: true,
      platform: true,
      coverUrl: true,
      categories: true,
    },
  },
  challengeCategory: true,
  difficulty: true,
  user: {
    select: {
      username: true,
      country: true,
      profilePicture: true,
    },
  },
  _count: {
    select: {
      participations: true,
      favoritedBy: true,
      votes: true,
    },
  },
};

const controller = {
  // GET /challenges
  async findAll(req: Request, res: Response) {
    const { page, limit }: PaginationParams =
      await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        select: selectParams,
        skip,
        take,
      }),

      prisma.challenge.count(),
    ]);

    res.status(200).json({
      data: challenges,
      page,
      limit,
      total,
    });
  },
  // GET /challenges/:slug
  async findOne(req: Request, res: Response) {
    const id = await parseIdFromParams(req.slug);

    const challenge = await prisma.challenge.findFirst({
      where: {
        id,
      },
      select: selectParams,
    });

    if (!challenge) throw new NotFoundError("Challenge not found.");

    res.status(200).send(challenge);
  },
  // POST /challenges

  /*
    title               String          @db.VarChar(200) => Dans le body
    description         String          @db.Text
    hints               String?         @db.Text
    demo                String?         @db.VarChar(255)
    goals               String?         @db.Text
    closesAt            DateTime?       @map("closes_at") @db.Timestamptz()
    gameId              Int             @map("game_id")
    challengeCategoryId Int             @map("challenge_category_id")
    difficultyId        Int             @map("difficulty_id")
  }
  */

  async createOne(req: Request, res: Response) {
    const {
      title,
      description,
      hints,
      demo,
      goals,
      closesAt,
      gameId,
      challengeCategoryId,
      difficultyId,
    } = await createOneChallengeBodySchema.parseAsync(req.body);

    const { username } = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.user.id,
      },
    });

    await prisma.challenge.create({
      data: {
        userId: req.user.id,
        title,
        slug: generateSlug(title, username),
        description,
        hints: hints ?? null,
        demo: demo ?? null,
        goals: goals ?? null,
        closesAt: closesAt ?? null,
        gameId,
        challengeCategoryId,
        difficultyId,
      },
    });

    res.status(201).send({
      message: "Challenge successfully created.",
    });
  },
  // PATCH /challenges/:id
  // DELETE /challenges/:id
};

export default controller;
