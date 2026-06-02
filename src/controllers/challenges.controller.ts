import type { Request, Response } from "express";
import { Prisma, prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  PaginationOutputSchema,
  QueryChallengeOutputSchema,
  type PaginationParams,
  type QueryChallengeParams,
} from "../schemas/query.schemas";

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
        select: selectParams,
        skip,
        take,
        orderBy: orderByClause,
      }),

      prisma.challenge.count({ where }),
    ]);

    res.status(200).json({
      data: challenges,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
};

export default controller;
