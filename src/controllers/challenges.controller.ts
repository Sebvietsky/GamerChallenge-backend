import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getPaginationParams } from "../utils/pagination.utils";
import { PaginationOutputSchema, type PaginationParams } from "../schemas/query.schemas";

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
      totalPages: Math.ceil(total / limit),
    });
  },
};

export default controller;
