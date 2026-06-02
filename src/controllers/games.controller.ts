import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";
import { getPaginationParams } from "../utils/pagination.utils";
import { PaginationOutputSchema, type PaginationParams } from "../schemas/query.schemas";
import { searchGamesQuerySchema } from "../schemas/games.schemas";
import { queryIGDB, buildCoverUrl } from "../utils/igdb.utils";
import type { IGDBGame } from "../lib/interface";

const selectParams = {
  id: true,
  igdbId: true,
  name: true,
  studio: true,
  platform: true,
  coverUrl: true,
  createdAt: true,
  categories: {
    select: {
      category: {
        select: { id: true, name: true },
      },
    },
  },
  _count: {
    select: { challenges: true },
  },
};

const controller = {
  async findAll(req: Request, res: Response): Promise<void> {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);
    const { skip, take } = getPaginationParams(page, limit);

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { visibility: true },
        select: selectParams,
        skip,
        take,
        orderBy: { name: "asc" },
      }),
      prisma.game.count({ where: { visibility: true } }),
    ]);

    res.status(200).json({
      data: games,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },

  // Identifiant public = igdbId. Retourne le jeu et ses challenges associés.
  // 404 si le jeu n'a pas encore de challenge créé (pas encore en BDD).
  async findOne(req: Request, res: Response): Promise<void> {
    const igdbId = parseInt(req.params.igdbId as string);

    const game = await prisma.game.findUnique({
      where: { igdbId },
      select: {
        ...selectParams,
        challenges: {
          where: { visibility: true },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            difficulty: true,
            challengeCategory: true,
            _count: { select: { participations: true } },
          },
        },
      },
    });

    if (!game) throw new NotFoundError("No challenges found for this game yet");

    res.status(200).json({ data: game });
  },

  // Recherche sur IGDB — utilisé pour l'autocomplétion lors de la création d'un challenge.
  async search(req: Request, res: Response): Promise<void> {
    const { q, limit } = await searchGamesQuerySchema.parseAsync(req.query);

    const games = await queryIGDB<IGDBGame[]>(
      "games",
      `fields name, summary, cover.url, platforms.name, involved_companies.developer, involved_companies.company.name;
       search "${q}";
       where version_parent = null;
       limit ${limit};`
    );

    const data = games.map((game) => {
      const developer = game.involved_companies?.find((ic) => ic.developer)?.company.name ?? null;
      const platforms = game.platforms?.map((p) => p.name).join(", ") ?? null;
      const coverUrl = game.cover ? buildCoverUrl(game.cover.url) : null;

      return {
        igdbId: game.id,
        name: game.name,
        summary: game.summary ?? null,
        studio: developer,
        platform: platforms,
        coverUrl,
      };
    });

    res.status(200).json({ data });
  },
};

export default controller;
