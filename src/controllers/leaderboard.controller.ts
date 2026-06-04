import { Prisma, prisma } from "../lib/prisma";
import type { Request, Response } from "express";
import {
  PaginationLeaderboardOutputSchema,
  type PaginationLeaderboardParams,
} from "../schemas/query.schemas";
import { getPaginationParams } from "../utils/pagination.utils";
import {
  challengeSelectParams,
  leaderboardParticipationSelectParams,
} from "../utils/controller.utils";
import type { MostActivUserResponse } from "../lib/interface";

const SINCE_DAYS: Record<NonNullable<PaginationLeaderboardParams["since"]>, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const controller = {
  async mostPlayedChallenges(req: Request, res: Response) {
    const { page, limit, since }: PaginationLeaderboardParams =
      await PaginationLeaderboardOutputSchema.parseAsync(req.query);

    const sinceDate = since
      ? new Date(Date.now() - SINCE_DAYS[since] * 24 * 60 * 60 * 1000)
      : undefined;

    const { skip, take } = getPaginationParams(page, limit);

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        select: challengeSelectParams,
        ...(sinceDate && { where: { createdAt: { gte: sinceDate } } }),
        orderBy: { participations: { _count: "desc" } },
        skip,
        take,
      }),

      prisma.challenge.count({ ...(sinceDate && { where: { createdAt: { gte: sinceDate } } }) }),
    ]);

    res.status(200).json({
      data: challenges,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },

  async mostAppreciateParticipationByCommunity(req: Request, res: Response) {
    const { page, limit, since }: PaginationLeaderboardParams =
      await PaginationLeaderboardOutputSchema.parseAsync(req.query);

    const sinceDate = since
      ? new Date(Date.now() - SINCE_DAYS[since] * 24 * 60 * 60 * 1000)
      : undefined;

    const { skip, take } = getPaginationParams(page, limit);

    const [participations, total] = await Promise.all([
      prisma.participation.findMany({
        ...(sinceDate && { where: { votes: { some: { createdAt: { gte: sinceDate } } } } }),
        orderBy: { votes: { _count: "desc" } },
        select: leaderboardParticipationSelectParams,
        skip,
        take,
      }),
      prisma.participation.count({
        ...(sinceDate && { where: { votes: { some: { createdAt: { gte: sinceDate } } } } }),
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

  async mostActifUsers(req: Request, res: Response) {
    const { page, limit, since }: PaginationLeaderboardParams =
      await PaginationLeaderboardOutputSchema.parseAsync(req.query);

    const sinceDate = since
      ? new Date(Date.now() - SINCE_DAYS[since] * 24 * 60 * 60 * 1000)
      : undefined;

    const { skip, take } = getPaginationParams(page, limit);

    /*
      Prisma ne peut pas ORDER BY sur une somme de deux _count différents.
      On utilise $queryRaw pour trier par (participations + challenges) directement en SQL.
      Sans `since` : all-time. Avec `since` : seules les activités dans la période comptent.
    */
    const dateFilterP = sinceDate ? Prisma.sql`AND p.created_at >= ${sinceDate}` : Prisma.empty;
    const dateFilterC = sinceDate ? Prisma.sql`AND c.created_at >= ${sinceDate}` : Prisma.empty;

    const [users, [{ total }]] = await Promise.all([
      prisma.$queryRaw<MostActivUserResponse[]>`
        SELECT
          u.id,
          u.username,
          u.country,
          u.profile_picture AS "profilePicture",
          COUNT(DISTINCT p.id)::int AS "participationCount",
          COUNT(DISTINCT c.id)::int AS "challengeCount",
          (COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id))::int AS "totalActivity"
        FROM users u
        LEFT JOIN participations p ON p.user_id = u.id ${dateFilterP}
        LEFT JOIN challenges     c ON c.user_id = u.id ${dateFilterC}
        GROUP BY u.id
        HAVING COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) > 0
        ORDER BY "totalActivity" DESC
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*)::int AS total
        FROM users u
        LEFT JOIN participations p ON p.user_id = u.id ${dateFilterP}
        LEFT JOIN challenges     c ON c.user_id = u.id ${dateFilterC}
        GROUP BY u.id
        HAVING COUNT(DISTINCT p.id) + COUNT(DISTINCT c.id) > 0
      `,
    ]);

    res.status(200).json({
      data: users,
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
    });
  },
};

export default controller;
