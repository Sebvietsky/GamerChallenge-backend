import { prisma } from "../lib/prisma";
import { challengeCategorySelectParams } from "../utils/controller.utils";
import type { Request, Response } from "express";

const controller = {
  async findAll(_req: Request, res: Response): Promise<void> {
    const challengeCategories = await prisma.challengeCategory.findMany({
      select: challengeCategorySelectParams,
      orderBy: { name: "asc" },
    });

    res.status(200).json(challengeCategories);
  },
};

export default controller;
