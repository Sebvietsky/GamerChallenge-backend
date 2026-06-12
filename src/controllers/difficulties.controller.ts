import { prisma } from "../lib/prisma";
import { difficultySelectParams } from "../utils/controller.utils";
import type { Request, Response } from "express";

const controller = {
  async findAll(_req: Request, res: Response): Promise<void> {
    const difficulties = await prisma.difficulty.findMany({
      select: difficultySelectParams,
      orderBy: { difficultyIndex: "asc" },
    });

    res.status(200).json(difficulties);
  },
};

export default controller;
