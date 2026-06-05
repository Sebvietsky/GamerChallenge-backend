import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { challengeSelectParams, participationSelectParams } from "../utils/controller.utils";
import { NotFoundError } from "../lib/errors";
import { PaginationOutputSchema, type PaginationParams } from "../schemas/query.schemas";
import { getPaginationParams } from "../utils/pagination.utils";

const controller = {
  async getFavoritesSlugs(req: Request, res: Response) {
    const favoriteChallenges = await prisma.userFavoriteChallenge.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        challenge: {
          select: {
            id: true,
            slug: true,
            visibility: true,
          },
        },
      },
    });

    const response =
      favoriteChallenges.length > 0 ? favoriteChallenges.map((chall) => chall.challenge) : [];

    return res.status(200).json(response);
  },

  async getFavorites(req: Request, res: Response) {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const favoriteChallenges = await prisma.userFavoriteChallenge.findMany({
      where: {
        userId: req.user.id,
      },
      select: { challenge: { select: challengeSelectParams } },
      skip,
      take,
    });

    if (favoriteChallenges.length === 0) throw new NotFoundError("No favorite yet");

    const challenge = favoriteChallenges.map((c) => c.challenge);

    const response = challenge.map((chall) => ({
      ...chall,
      game: {
        ...chall.game,
        categories: chall.game.categories.map(({ category }) => category.name),
      },
    }));

    res.status(200).json(response);
  },

  async getLikedChallengesSlugs(req: Request, res: Response) {
    const likedChallenges = await prisma.challengeVote.findMany({
      where: { userId: req.user.id },
      select: {
        challenge: {
          select: {
            id: true,
            slug: true,
            visibility: true,
          },
        },
      },
    });

    const response =
      likedChallenges.length > 0 ? likedChallenges.map((chall) => chall.challenge) : [];

    res.status(200).json(response);
  },

  async getLikedChallenges(req: Request, res: Response) {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const likedChallenges = await prisma.challengeVote.findMany({
      where: {
        userId: req.user.id,
      },
      select: { challenge: { select: challengeSelectParams } },
      skip,
      take,
    });

    if (likedChallenges.length === 0) throw new NotFoundError("No liked challenge yet");

    const challenge = likedChallenges.map((c) => c.challenge);

    const response = challenge.map((chall) => ({
      ...chall,
      game: {
        ...chall.game,
        categories: chall.game.categories.map(({ category }) => category.name),
      },
    }));

    res.status(200).json(response);
  },

  async getLikedParticipationsSlugs(req: Request, res: Response) {
    const likedParticipations = await prisma.participationVote.findMany({
      where: { userId: req.user.id },
      select: {
        participation: {
          select: {
            id: true,
            slug: true,
            visibility: true,
          },
        },
      },
    });

    const response = likedParticipations.length
      ? likedParticipations.map((part) => part.participation)
      : [];

    return res.status(200).json(response);
  },

  async getLikedParticipations(req: Request, res: Response) {
    const { page, limit }: PaginationParams = await PaginationOutputSchema.parseAsync(req.query);

    const { skip, take } = getPaginationParams(page, limit);

    const likedParticipations = await prisma.participationVote.findMany({
      where: { userId: req.user.id },
      select: { participation: { select: participationSelectParams } },
      skip,
      take,
    });
    if (likedParticipations.length === 0) throw new NotFoundError("No liked participation yet");

    const response = likedParticipations.map((part) => part.participation);
    res.status(200).json(response);
  },

  async getDashboard(req: Request, res: Response) {
    const where = { userId: req.user.id };

    const [
      totalParticipation,
      totalChallengeCreated,
      totalChallengeUserVoted,
      totalParticipationUserVoted,
      totalVoteReceivedOnChallenge,
      totalVoteReceivedOnParticipation,
      mostLikedChallenge,
      mostLikedParticipation,
    ] = await Promise.all([
      prisma.participation.count({ where }),
      prisma.challenge.count({ where }),
      prisma.challengeVote.count({ where }),
      prisma.participationVote.count({ where }),
      prisma.challengeVote.count({ where: { challenge: { userId: req.user.id } } }),
      prisma.participationVote.count({ where: { participation: { userId: req.user.id } } }),
      prisma.challenge.findFirst({
        where,
        select: challengeSelectParams,
        orderBy: { votes: { _count: "desc" } },
      }),
      prisma.participation.findFirst({
        where,
        select: participationSelectParams,
        orderBy: { votes: { _count: "desc" } },
      }),
    ]);

    res.status(200).json({
      totalParticipation,
      totalChallengeCreated,
      totalChallengeUserVoted,
      totalParticipationUserVoted,
      totalVoteReceivedOnChallenge,
      totalVoteReceivedOnParticipation,
      mostLikedChallenge,
      mostLikedParticipation,
    });
  },
};

export default controller;
