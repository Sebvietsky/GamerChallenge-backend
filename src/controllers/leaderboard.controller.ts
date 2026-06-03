import { prisma } from "../lib/prisma";
import type { Request, Response } from "express";
import { PaginationOutputSchema, type PaginationLeaderboardParams } from "../schemas/query.schemas";
import { getPaginationParams } from "../utils/pagination.utils";

const controller = {
  async mostPlayedChallenges(req: Request, res: Response) {
    const { page, limit }: PaginationLeaderboardParams = await PaginationOutputSchema.parseAsync(
      req.query
    );

    const { skip, take } = getPaginationParams(page, limit);
    const challenges = await prisma.challenge.findMany({
      orderBy: { participations: { _count: "desc" } },
      skip,
      take,
    });

    res.status(200).json(challenges);
  },

  async mostActifUsers(req: Request, res: Response) {
    const { page, limit }: PaginationLeaderboardParams = await PaginationOutputSchema.parseAsync(
      req.query
    );

    const { skip, take } = getPaginationParams(page, limit);

    await prisma.user.findMany({
      select: {
        _count: {
          select: {
            participations: true,
          },
        },
      },
      orderBy: { participations: { _count: "desc" } },
      skip,
      take,
    });

    await prisma.user.findMany({
      select: {
        _count: {
          select: {
            challenges: true,
          },
        },
      },
      orderBy: { challenges: { _count: "desc" } },
      skip,
      take,
    });

    // {users, totalParticipation, totalChallengeCreated}

    res.status(200).json();
  },
};

export default controller;
