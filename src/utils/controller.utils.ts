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

    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

    .replace(/['’]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/-+/g, "-")

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
  _count: {
    select: {
      participations: true,
      challenges: true,
    },
  },
  challenges: {
    select: {
      _count: {
        select: {
          votes: true,
          participations: true,
        },
      },
    },
  },
  participations: {
    select: {
      _count: {
        select: {
          votes: true,
        },
      },
    },
  },
};

export const hintsSelectParams = {
  description: true,
  position: true,
  challengeId: true,
};

export const challengeSelectParams = {
  id: true,
  title: true,
  slug: true,
  closesAt: true,
  status: true,
  createdAt: true,
  hints: { select: hintsSelectParams },
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
  hints: { select: hintsSelectParams },
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
  id: true,
  video: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  visibility: true,
  user: { select: userSelectParams },
  challenge: {
    select: {
      game: {
        select: {
          name: true,
          coverUrl: true,
        },
      },
    },
  },
  _count: {
    select: {
      votes: true,
    },
  },
};
