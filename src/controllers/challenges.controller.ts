import type { Request, Response } from "express";
import { Prisma, prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  FindBestForHomePageQuerySchema,
  PaginationOutputSchema,
  QueryChallengeOutputSchema,
  type FindBestForHomePageQueryParams,
  type PaginationParams,
  type QueryChallengeParams,
} from "../schemas/query.schemas";
import {
  generateSlug,
  parseSlugFromParams,
  challengeSelectParams,
  participationSelectParams,
  challengeSlugSelectParams,
} from "../utils/controller.utils";
import { NotFoundError } from "../lib/errors";
import {
  createOneChallengeBodySchema,
  createOneParticipationWithinOneChallengeBodySchema,
  updateOneChallengeBodySchema,
  type updateOneChallengeParams,
} from "../schemas/challenge.schemas";
import { findOrCreateGameFromIGDB } from "../utils/game.utils";
import { ChallengesOrderBy } from "../lib/enum";

const SINCE_DAYS: Record<NonNullable<FindBestForHomePageQueryParams["since"]>, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const controller = {
  async findBest(req: Request, res: Response): Promise<void> {
    const { since, limit, sortBy }: FindBestForHomePageQueryParams =
      await FindBestForHomePageQuerySchema.parseAsync(req.query);

    const sinceDate = since
      ? new Date(Date.now() - SINCE_DAYS[since] * 24 * 60 * 60 * 1000)
      : undefined;

    const ORDER_BY_MAP: Record<
      NonNullable<FindBestForHomePageQueryParams["sortBy"]>,
      Prisma.ChallengeOrderByWithRelationInput
    > = {
      votes: { votes: { _count: "desc" } },
      participations: { participations: { _count: "desc" } },
      createdAt: { createdAt: "desc" },
    };

    const challenges = await prisma.challenge.findMany({
      where: {
        ...(sinceDate && { createdAt: { gte: sinceDate } }),
      },
      select: challengeSelectParams,
      orderBy: ORDER_BY_MAP[sortBy],
      take: limit,
    });

    const response = challenges.map((chall) => ({
      ...chall,
      game: {
        ...chall.game,
        categories: chall.game.categories.map(({ category }) => category.name),
      },
    }));

    res.status(200).json({ data: response });
  },

  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);
    const {
      search,
      category,
      game,
      difficulty,
      creator,
      status,
      since,
      closesAfter,
      closesBefore,
      orderBy,
      sort,
    }: QueryChallengeParams = await QueryChallengeOutputSchema.parseAsync(req.query);

    const sinceDate = since
      ? new Date(Date.now() - SINCE_DAYS[since] * 24 * 60 * 60 * 1000)
      : undefined;

    const where: Prisma.ChallengeWhereInput = {
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(sinceDate && { createdAt: { gte: sinceDate } }),
      ...(category && { challengeCategory: { name: category } }),
      ...(game && { game: { name: { contains: game, mode: "insensitive" } } }),
      ...(difficulty && { difficulty: { name: difficulty } }),
      ...(creator && {
        user: { username: { contains: creator, mode: "insensitive" } },
      }),
      ...(status && { status }),

      ...((closesAfter || closesBefore) && {
        closesAt: {
          ...(closesAfter && { gte: closesAfter }),
          ...(closesBefore && { lte: closesBefore }),
        },
      }),
    };

    const COUNT_FIELDS = ["votes", "participations"] as const;

    const orderByClause: Prisma.ChallengeOrderByWithRelationInput = orderBy
      ? orderBy === ChallengesOrderBy.difficulty
        ? { difficulty: { difficultyIndex: sort } }
        : COUNT_FIELDS.includes(orderBy as (typeof COUNT_FIELDS)[number])
          ? { [orderBy]: { _count: sort } }
          : { [orderBy]: orderBy === "closesAt" ? { sort, nulls: "last" } : sort }
      : { createdAt: "desc" };

    const { skip, take } = getPaginationParams(page, limit);

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        select: challengeSelectParams,
        skip,
        take,
        orderBy: orderByClause,
      }),

      prisma.challenge.count({ where }),
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

  async findOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const challenge = await prisma.challenge.findUniqueOrThrow({
      where: {
        slug,
      },
      select: challengeSlugSelectParams,
    });

    if (!challenge) throw new NotFoundError("Challenge not found.");

    const response = {
      ...challenge,
      game: {
        ...challenge.game,
        categories: challenge.game.categories.map(({ category }) => category.name),
      },
    };

    res.status(200).json(response);
  },

  async findAllParticipationsWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const [participations, total] = await Promise.all([
      prisma.participation.findMany({
        where: {
          challenge: {
            slug,
          },
        },
        select: participationSelectParams,

        skip,
        take,
      }),

      prisma.participation.count({
        where: {
          challenge: {
            slug,
          },
        },
      }),
    ]);

    res.status(200).json({
      data: participations,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },

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
      status,
    } = await createOneChallengeBodySchema.parseAsync(req.body);

    const gameId = await findOrCreateGameFromIGDB(igdbId);

    await prisma.challenge.create({
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
        title,
        slug: generateSlug(title),
        description,
        hints: hints ?? null,
        demo: demo ?? null,
        goals: goals ?? null,
        closesAt: closesAt ?? null,
        status,
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

    res.status(201).json({
      message: "Challenge successfully created.",
    });
  },

  async createOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const { title, description, video } =
      await createOneParticipationWithinOneChallengeBodySchema.parseAsync(req.body);

    await prisma.participation.create({
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
        challenge: {
          connect: {
            slug,
          },
        },
        title,
        slug: generateSlug(title),
        description,
        video,
      },
    });

    res.status(201).json({
      message: "Participation successfully created.",
    });
  },

  async updateOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const { igdbId, ...body }: updateOneChallengeParams =
      await updateOneChallengeBodySchema.parseAsync(req.body);

    const data = body as Prisma.ChallengeUncheckedUpdateInput;

    let gameId: number;

    if (igdbId) {
      gameId = await findOrCreateGameFromIGDB(igdbId as number);
      data.gameId = gameId;
    }

    await prisma.challenge.update({
      where: {
        slug,
      },
      data,
    });

    res.status(200).json({
      message: "Challenge successfully updated.",
    });
  },

  async deleteOne(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.challenge.delete({
      where: {
        slug,
      },
    });

    res.status(204).end();
  },

  async userLikeChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    console.log(slug);
    await prisma.challengeVote.create({
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
        challenge: {
          connect: {
            slug,
          },
        },
      },
    });

    res.status(201).json({ message: "Challenge liked success" });
  },

  async userUnlikeChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.challengeVote.deleteMany({
      where: {
        userId: req.user.id,
        challenge: {
          slug,
        },
      },
    });

    res.status(204).end();
  },

  async userAddChallengeToFavorites(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.userFavoriteChallenge.create({
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
        challenge: {
          connect: {
            slug,
          },
        },
      },
    });

    res.status(201).json({ message: "Challenge add to favorite" });
  },

  async userDeleteChallengeFromHisFavorites(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.userFavoriteChallenge.deleteMany({
      where: {
        userId: req.user.id,
        challenge: {
          slug,
        },
      },
    });

    res.status(204).end();
  },
};

export default controller;
