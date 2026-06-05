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

/**
 * TRADUCTIONS FRANÇAISES DES COMMENTAIRES (POUR RÉFÉRENCE) :
 *
 * findOneParticipationWithinOneChallenge :
 * Récupère une participation unique et les détails du défi associé par slug.
 * Formate la réponse pour inclure les catégories de jeux sous forme d'un simple tableau de chaînes de caractères.
 *
 * userLikeParticipation :
 * Permet à un utilisateur connecté de voter pour une participation spécifique.
 *
 * updateOneParticipationWithinOneChallenge :
 * Met à jour une participation.
 * LOGIQUE DE SÉCURITÉ :
 * - Si l'utilisateur a un rôle 'user' : Il ne peut mettre à jour que sa propre participation.
 *   On utilise 'updateMany' avec 'userId' dans le filtre pour imposer cette propriété.
 *   Si aucun enregistrement n'est mis à jour (count === 0), cela signifie que l'utilisateur n'est pas le propriétaire.
 * - Si l'utilisateur a un rôle administratif : Il peut mettre à jour n'importe quelle participation par slug.
 *
 * deleteOneParticipationWithinOneChallenge :
 * Supprime une participation.
 * LOGIQUE DE SÉCURITÉ :
 * - Si l'utilisateur a un rôle 'user' : Il ne peut supprimer que sa propre participation.
 *   On utilise 'deleteMany' avec 'userId' dans le filtre pour imposer cette propriété.
 *   Si aucun enregistrement n'est supprimé (count === 0), cela signifie que l'utilisateur n'est pas le propriétaire.
 * - Si l'utilisateur a un rôle administratif : Il peut supprimer n'importe quelle participation par slug.
 *
 * userUnlikeParticipation :
 * Permet à un utilisateur connecté de retirer son vote d'une participation.
 */

const controller = {
  /**
   * Retrieves a single participation and its associated challenge details by slug.
   * Formats the response to include game categories as a simple array of strings.
   */

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

  /**
   * Allows a connected user to upvote a specific participation.
   */

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

  /**
   * Updates a participation.
   *
   * SECURITY LOGIC:
   * - If the user has a 'user' role: They can only update their own participation.
   *   We use 'updateMany' with 'userId' in the filter to enforce this ownership.
   *   If no records are updated (count === 0), it means the user is not the owner.
   * - If the user has an administrative role: They can update any participation by slug.
   */

  // PATCH /participations/:slug
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
      // Standard users are restricted to their own records
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
      // Admins/Moderators can update any record
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

  /**
   * Deletes a participation.
   *
   * SECURITY LOGIC:
   * - If the user has a 'user' role: They can only delete their own participation.
   *   We use 'deleteMany' with 'userId' in the filter to enforce this ownership.
   *   If no records are deleted (count === 0), it means the user is not the owner.
   * - If the user has an administrative role: They can delete any participation by slug.
   */

  // DELETE /participations/:slug
  async deleteOneParticipationWithinOneChallenge(req: Request, res: Response) {
    const slug = await parseSlugFromParams(req.params.slug as string);
    const userId = req.user.id;

    if (req.user.role === UserRole.user) {
      // Standard users are restricted to their own records
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
      // Admins/Moderators can delete any record
      await prisma.participation.delete({
        where: {
          slug,
        },
      });
    }

    res.status(204).end();
  },

  /**
   * Allows a connected user to remove their upvote from a participation.
   */

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
