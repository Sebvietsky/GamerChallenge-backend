import { type Request, type Response } from "express";
import {
  challengeSelectParams,
  parseSlugFromParams,
  participationSelectParams,
} from "../utils/controller.utils";
import { Prisma, prisma, UserRole } from "../lib/prisma";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import { updateOneParticipationWithinOneChallengeBodySchema } from "../schemas/participations.schema";

const controller = {
  // GET /participations/:slug
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

    res.status(200).send(response);
  },

  // POST /participations/:slug/vote
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

  // PATCH /participations/:slug
  async updateOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    const userId = req.user.id;

    const body = await updateOneParticipationWithinOneChallengeBodySchema.parseAsync(req.body);

    const data = body as Prisma.ParticipationUncheckedUpdateInput;

    if (req.user.role === UserRole.user) {
      const result = await prisma.participation.updateMany({
        where: {
          slug,
          userId,
        },
        data,
      });
      if (result.count === 0) {
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

    res.status(200).send({
      message: "Participation successfully updated.",
    });
  },

  // DELETE /participations/:slug
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

  // DELETE /participations/:slug/vote
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
