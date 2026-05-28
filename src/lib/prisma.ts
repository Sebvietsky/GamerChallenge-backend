import env from "../config/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// On réexporte tous les modèles pour faciliter leur utilisatation dans le reste de l'application
export * from "../../generated/prisma/client.ts";

const connectionString = env.databaseUrl;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
