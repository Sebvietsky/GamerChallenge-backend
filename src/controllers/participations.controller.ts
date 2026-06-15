import { type Request, type Response } from "express";
import {
  challengeSelectParams,
  generateSlug,
  parseSlugFromParams,
  participationSelectParams,
} from "../utils/controller.utils";
import { Prisma, prisma, UserRole } from "../lib/prisma";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { updateOneParticipationWithinOneChallengeBodySchema } from "../schemas/participations.schema";
import { PaginationOutputSchema, type PaginationParams } from "../schemas/query.schemas";
import { getPaginationParams } from "../utils/pagination.utils";

const controller = {
  async findTrends(req: Request, res: Response) {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const sinceDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [trendingParticipations, total] = await Promise.all([
      prisma.participation.findMany({
        where: {
          createdAt: { gte: sinceDate },
        },
        select: { ...participationSelectParams, challenge: { select: challengeSelectParams } },
        distinct: "id",
        skip,
        take,
      }),

      prisma.participation.count({
        where: {
          createdAt: { gte: sinceDate },
        },
      }),
    ]);

    if (trendingParticipations.length === 0)
      throw new NotFoundError("No Trending Participations yet");

    res.status(200).json({
      data: trendingParticipations,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },

  async findOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const participation = await prisma.participation.findUniqueOrThrow({
      where: {
        slug,
      },
      select: { ...participationSelectParams, challenge: { select: challengeSelectParams } },
    });

    const response = {
      ...participation,
      challenge: {
        ...participation.challenge,
        game: {
          ...participation.challenge.game,
          categories: participation.challenge.game.categories.map(({ category }) => category.name),
        },
      },
    };

    res.status(200).json(response);
  },

  async userLikeParticipation(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.participationVote.create({
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
        participation: {
          connect: {
            slug,
          },
        },
      },
    });

    res.status(200).json({ message: "Upvote successfully added to the participation." });
  },

  async updateOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    const userId = req.user.id;

    const body = await updateOneParticipationWithinOneChallengeBodySchema.parseAsync(req.body);

    const data = body as Prisma.ParticipationUncheckedUpdateInput;

    if (data.title) {
      const title = data.title as string;

      data.slug = generateSlug(title);
    }

    if (req.user.role === UserRole.user) {
      const result = await prisma.participation.updateMany({
        where: {
          slug,
          userId,
        },
        data,
      });
      if (result.count === 0) {
        const exists = await prisma.participation.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!exists) throw new NotFoundError("Participation not found");
        throw new ForbiddenError(
          "The connected user is not authorize to modify this participation"
        );
      }
    } else {
      await prisma.participation.update({
        where: {
          slug,
        },
        data,
      });
    }

    res.status(200).json({
      message: "Participation successfully updated.",
    });
  },

  async deleteOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    const userId = req.user.id;

    if (req.user.role === UserRole.user) {
      const result = await prisma.participation.deleteMany({
        where: {
          slug,
          userId,
        },
      });
      if (result.count === 0) {
        throw new ForbiddenError(
          "The connected user is not authorize to delete this participation"
        );
      }
    } else {
      await prisma.participation.delete({
        where: {
          slug,
        },
      });
    }

    res.status(204).end();
  },

  async userUnlikeParticipation(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    const userId = req.user.id;

    await prisma.participationVote.deleteMany({
      where: {
        userId,
        participation: {
          slug,
        },
      },
    });

    res.status(204).end();
  },
};

export default controller;
