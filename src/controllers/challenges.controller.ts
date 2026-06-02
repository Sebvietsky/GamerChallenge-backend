import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  PaginationOutputSchema,
  type PaginationParams,
} from "../schemas/query.schemas";
import { generateSlug, parseSlugFromParams } from "../utils/controller.utils";
import { NotFoundError } from "../lib/errors";
import {
  createOneChallengeBodySchema,
  updateOneChallengeBodySchema,
} from "../schemas/challenge.schemas";
import { findOrCreateGameFromIGDB } from "../utils/game.utils";

const challengeSelectParams = {
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
      categories: {
        select: {
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  challengeCategory: {
    select: {
      name: true,
      colorCode: true,
    },
  },
  difficulty: {
    select: {
      name: true,
      colorCode: true,
    },
  },
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
  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit }: PaginationParams =
      await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        select: challengeSelectParams,
        skip,
        take,
      }),

      prisma.challenge.count(),
    ]);

    const response = challenges.map((chall) => ({
      ...chall,
      game: {
        ...chall.game,
        categories: chall.game.categories.map(({ category }) => category.name),
      },
    }));

    res.status(200).json({
      data: response,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },

  // GET /challenges/:slug
  async findOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const challenge = await prisma.challenge.findFirst({
      where: {
        slug,
      },
      select: challengeSelectParams,
    });

    if (!challenge) throw new NotFoundError("Challenge not found.");

    const response = {
      ...challenge,
      game: {
        ...challenge.game,
        categories: challenge.game.categories.map(
          ({ category }) => category.name,
        ),
      },
    };

    res.status(200).send(response);
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
      igdbId,
      challengeCategoryId,
      difficultyId,
    } = await createOneChallengeBodySchema.parseAsync(req.body);

    const { username } = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.user.id,
      },
    });

    const gameId = await findOrCreateGameFromIGDB(igdbId);

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
  async updateOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

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
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.challenge.delete({
      where: {
        slug,
      },
    });

    res.status(204).end();
  },
};

export default controller;
