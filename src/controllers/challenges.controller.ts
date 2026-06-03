import type { Request, Response } from "express";
import { Prisma, prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  PaginationOutputSchema,
  QueryChallengeOutputSchema,
  type PaginationParams,
  type QueryChallengeParams,
} from "../schemas/query.schemas";
import { generateSlug, parseSlugFromParams } from "../utils/controller.utils";
import { NotFoundError } from "../lib/errors";
import {
  createOneChallengeBodySchema,
  updateOneChallengeBodySchema,
  type updateOneChallengeParams,
} from "../schemas/challenge.schemas";
import { findOrCreateGameFromIGDB } from "../utils/game.utils";

const controller = {
  // GET /challenges
  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);
    const {
      search,
      category,
      game,
      difficulty,
      creator,
      status,
      closesAfter,
      closesBefore,
      orderBy,
      sort,
    }: QueryChallengeParams = await QueryChallengeOutputSchema.parseAsync(req.query);

    const where: Prisma.ChallengeWhereInput = {
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(category && { challengeCategory: { name: category } }),
      ...(game && { game: { name: { contains: game, mode: "insensitive" } } }),
      ...(difficulty && { difficulty: { name: difficulty } }),
      ...(creator && { user: { username: { contains: creator, mode: "insensitive" } } }),
      ...(status && { status }),
      /*
        Filtre par date de fermeture. Les challenges dont closesAt est NULL (sans date de fin)
        sont exclus dès qu'un filtre de date est appliqué — ils apparaissent dans le listing général.
        gte = "greater than or equal" (supérieur ou égal), lte = "less than or equal" (inférieur ou égal).
      */
      ...((closesAfter || closesBefore) && {
        closesAt: {
          ...(closesAfter && { gte: closesAfter }),
          ...(closesBefore && { lte: closesBefore }),
        },
      }),
    };

    /*
      votes et participations ne sont pas des champs directs sur Challenge mais des relations (tableaux).
      Prisma ne peut pas trier directement par une relation — il faut lui dire de trier par leur nombre
      avec { _count: sort }. COUNT_FIELDS sert à identifier ces deux cas pour leur appliquer ce format.
    */
    const COUNT_FIELDS = ["votes", "participations"] as const;

    /*
      Selon le champ demandé, Prisma attend trois formats différents :
        - Champ simple (title, status…)   → { title: "asc" }
        - Relation comptée (votes…)        → { votes: { _count: "desc" } }
        - Champ nullable (closesAt)        → { closesAt: { sort: "desc", nulls: "last" } }

      Pour votes/participations : COUNT_FIELDS.includes() vérifie si orderBy est l'un des deux.
      Le cast `as (typeof COUNT_FIELDS)[number]` est nécessaire car TypeScript ne sait pas
      qu'un string quelconque peut être comparé aux valeurs littérales du tableau — ce cast
      lui précise que orderBy est forcément "votes" | "participations" dans ce contexte.

      Pour closesAt : seul ce champ est nullable, donc seul lui a besoin de nulls: "last".
      Sans ça, PostgreSQL place les NULL en premier lors d'un tri DESC, ce qui ferait remonter
      les challenges sans date de fermeture avant tous les autres.

      Par défaut (pas d'orderBy) : tri par date de création décroissante, les plus récents en premier.
    */
    const orderByClause: Prisma.ChallengeOrderByWithRelationInput = orderBy
      ? COUNT_FIELDS.includes(orderBy as (typeof COUNT_FIELDS)[number])
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
        categories: challenge.game.categories.map(({ category }) => category.name),
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
