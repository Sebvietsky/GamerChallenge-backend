import z from "zod";
import { BadRequestError } from "../lib/errors";
import env from "../config/env";

export async function parseIdFromParams(id: string) {
  return await z.coerce.number().int().min(1).parseAsync(id);
}

export async function parseSlugFromParams(slug: string) {
  if (env.nodeEnv === "development") return await z.string().min(2).parseAsync(slug);
  return await z.string().min(38).parseAsync(slug);
}

export function generateSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    // Supprime les accents (é -> e, à -> a, etc.)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remplace les apostrophes par rien
    .replace(/['’]/g, "")
    // Remplace tout ce qui n'est pas lettre/chiffre par un espace
    .replace(/[^a-z0-9]+/g, "-")
    // Évite les --- successifs
    .replace(/-+/g, "-")
    // Supprime les - au début et à la fin
    .replace(/^-|-$/g, "");

  if (!slug) throw new BadRequestError("Invalid Title");

  const uuid = crypto.randomUUID();

  const finalSlug = `${slug}-${uuid}`;

  return finalSlug;
}

export const gameSelectParams = {
  name: true,
  studio: true,
  platform: true,
  coverUrl: true,
  bannerUrl: true,
  categories: {
    select: {
      category: {
        select: {
          name: true,
        },
      },
    },
  },
};

export const challengeCategorySelectParams = {
  name: true,
  colorCode: true,
};

export const difficultySelectParams = {
  name: true,
  colorCode: true,
};

export const userSelectParams = {
  username: true,
  country: true,
  profilePicture: true,
};

export const challengeSelectParams = {
  id: true,
  title: true,
  slug: true,
  closesAt: true,
  status: true,
  createdAt: true,
  game: { select: gameSelectParams },
  challengeCategory: { select: challengeCategorySelectParams },
  difficulty: { select: difficultySelectParams },
  user: { select: userSelectParams },
  _count: {
    select: {
      participations: true,
      favoritedBy: true,
      votes: true,
    },
  },
};

export const challengeSlugSelectParams = {
  id: true,
  title: true,
  slug: true,
  closesAt: true,
  status: true,
  createdAt: true,
  description: true,
  hints: true,
  demo: true,
  goals: true,
  game: { select: gameSelectParams },
  challengeCategory: { select: challengeCategorySelectParams },
  difficulty: { select: difficultySelectParams },
  user: { select: userSelectParams },
  _count: {
    select: {
      participations: true,
      favoritedBy: true,
      votes: true,
    },
  },
};

export const leaderboardParticipationSelectParams = {
  title: true,
  slug: true,
  video: true,
  user: { select: { id: true, username: true, profilePicture: true } },
  challenge: {
    select: {
      title: true,
      slug: true,
      difficulty: { select: difficultySelectParams },
      game: {
        select: {
          name: true,
          coverUrl: true,
        },
      },
    },
  },
  _count: { select: { votes: true } },
};

export const participationSelectParams = {
  video: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  visibility: true,
  user: { select: userSelectParams },
  _count: {
    select: {
      votes: true,
    },
  },
};
