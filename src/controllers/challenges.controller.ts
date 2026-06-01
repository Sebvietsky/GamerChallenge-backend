import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  PaginationOutputSchema,
  type PaginationParams,
} from "../schemas/query.schemas";
import { generateSlug, parseSlugFromParams } from "./utils";
import { BadRequestError, NotFoundError } from "../lib/errors";
import {
  createOneChallengeBodySchema,
  updateOneChallengeBodySchema,
} from "../schemas/challenge.schemas";

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
    const slug = await parseSlugFromParams(req.params.slug);

    const challenge = await prisma.challenge.findFirst({
      where: {
        slug,
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
        user: {
          connect: {
            id: req.user.id,
          },
        },
        title,
        slug: generateSlug(title, username),
        description,
        hints: hints ?? null,
        demo: demo ?? null,
        goals: goals ?? null,
        closesAt: closesAt ?? null,
        game: {
          connect: {
            id: gameId,
          },
        },
        challengeCategory: {
          connect: {
            id: challengeCategoryId,
          },
        },
        difficulty: {
          connect: {
            id: difficultyId,
          },
        },
      },
    });

    res.status(201).send({
      message: "Challenge successfully created.",
    });
  },
  // PATCH /challenges/:slug
  async updateChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug);

    const body = await updateOneChallengeBodySchema.parseAsync(req.body);

    const data = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    );

    await prisma.challenge.update({
      where: {
        slug,
      },
      data,
    });

    res.status(200).send({
      message: "Challenge successfully updated.",
    });
  },

  // DELETE /challenges/:slug
  async deleteOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug);

    await prisma.challenge.delete({
      where: {
        slug,
      },
    });

    res.send(204).end();
  },
};

export default controller;
