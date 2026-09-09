

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Les migrations exigent une connexion directe : le pooler (PgBouncer,
    // endpoint "-pooler" chez Neon) ne supporte pas les instructions DDL
    // transactionnelles ni les prepared statements dont Prisma Migrate a
    // besoin. DIRECT_URL n'existe qu'en production ; en local, ou l'on se
    // connecte deja directement a Postgres, DATABASE_URL suffit.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://build:build@localhost:5432/build",
  },
});
