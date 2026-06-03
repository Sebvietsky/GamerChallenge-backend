import { prisma } from "../lib/prisma";
import { queryIGDB, buildCoverUrl } from "./igdb.utils";
import type { IGDBGame } from "../lib/interface";
import { NotFoundError } from "../lib/errors";

export async function findOrCreateGameFromIGDB(igdbId: number): Promise<number> {
  const existing = await prisma.game.findUnique({ where: { igdbId } });
  if (existing) return existing.id;

  const [igdbGame] = await queryIGDB<IGDBGame[]>(
    "games",
    `fields name, cover.url, platforms.name, genres.name, involved_companies.developer, involved_companies.company.name;
     where id = ${igdbId};
     limit 1;`
  );

  if (!igdbGame) throw new NotFoundError("Game not found on IGDB");

  const developer =
    (igdbGame.involved_companies?.find((ic) => ic.developer)?.company.name ?? null)?.slice(
      0,
      150
    ) ?? null;
  const platforms =
    (igdbGame.platforms?.map((p) => p.name).join(", ") ?? null)?.slice(0, 100) ?? null;
  const coverUrl = igdbGame.cover ? buildCoverUrl(igdbGame.cover.url) : null;

  const categoryIds = await Promise.all(
    (igdbGame.genres ?? []).map(async (genre) => {
      const category = await prisma.gameCategory.upsert({
        where: { name: genre.name },
        create: { name: genre.name },
        update: {},
      });
      return category.id;
    })
  );

  const game = await prisma.game.create({
    data: {
      igdbId,
      name: igdbGame.name,
      studio: developer,
      platform: platforms,
      coverUrl,
      ...(categoryIds.length && {
        categories: {
          create: categoryIds.map((gameCategoryId) => ({ gameCategoryId })),
        },
      }),
    },
  });

  return game.id;
}
