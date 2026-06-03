import { type Request, type Response } from "express";
import {
  challengeSelectParams,
  parseSlugFromParams,
  participationSelectParams,
} from "../utils/controller.utils";
import { Prisma, prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";
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

    if (!participation) throw new NotFoundError("Challenge not found.");

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

  // PATCH /participations/:slug
  async updateOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    const body = await updateOneParticipationWithinOneChallengeBodySchema.parseAsync(req.body);

    const data = body as Prisma.ParticipationUncheckedUpdateInput;

    await prisma.participation.update({
      where: {
        slug,
      },
      data,
    });

    res.status(200).send({
      message: "Participation successfully updated.",
    });
  },

  // DELETE /participations/:slug
  async deleteOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);

    await prisma.challenge.delete({
      where: {
        slug,
      },
    });

    res.status(204).end();
  },
};

export default controller;
