import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import env from "../config/env";

export async function setup() {
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  const prisma = new PrismaClient({ adapter });

  await prisma.participationVote.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.challengeVote.deleteMany();
  await prisma.userFavoriteChallenge.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  await prisma.gameCategory.deleteMany();
  await prisma.challengeCategory.deleteMany();
  await prisma.difficulty.deleteMany();

  await prisma.$disconnect();
}
