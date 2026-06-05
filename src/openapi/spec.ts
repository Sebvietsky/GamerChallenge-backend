import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Side-effect imports — enregistre toutes les routes dans le registry
import "./paths/auth.paths";
import "./paths/challenges.paths";
import "./paths/games.paths";
import "./paths/participations.paths";
import "./paths/leaderboard.paths";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateOpenAPIDocument(): any {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "GamerChallenges API",
      version: "1.0.0",
      description:
        "API REST du projet GamerChallenges — challenges de jeux vidéo, participations, classements.",
    },
    servers: [{ url: "/api", description: "Serveur local" }],
  });
}
