import { type Request, type Response } from "express";
import {
  parseSlugFromParams,
  participationSelectParams,
} from "../utils/controller.utils";
import { prisma } from "../lib/prisma";
import { NotFoundError } from "../lib/errors";

const controller = {
  // GET /participations/:slugParticipation
  async findOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slugParticipation = await parseSlugFromParams(
      req.params.slugParticipation as string,
    );

    const participation = await prisma.participation.findUniqueOrThrow({
      where: {
        slug: slugParticipation,
      },
      select: participationSelectParams,
    });

    if (!participation) throw new NotFoundError("Challenge not found.");

    const response = {
      ...participation,
      challenge: {
        ...participation.challenge,
        game: {
          ...participation.challenge.game,
          categories: participation.challenge.game.categories.map(
            ({ category }) => category.name,
          ),
        },
      },
    };

    res.status(200).send(response);
  },

  // PATCH /challenges/:slugChallenge/participations:slugParticipation
  async updateOneParticipationWithinOneChallenge(
    req: Request,
    res: Response,
  ) {},

  // DELETE /challenges/:slugChallenge/participations:slugParticipation
  async deleteOneParticipationWithinOneChallenge(
    req: Request,
    res: Response,
  ) {},
};
