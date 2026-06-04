import { z } from "../lib/zod";

export const searchGamesQuerySchema = z.object({
  q: z
    .string()
    .min(1)
    .max(100)
    .openapi({ description: "Terme de recherche (nom du jeu)", example: "Zelda" }),
  limit: z.coerce
    .number()
    .min(1)
    .max(50)
    .default(10)
    .openapi({ description: "Nombre de résultats (1-50, défaut: 10)" }),
  bannerSize: z
    .enum(["screenshot_huge", "1080p", "original"])
    .default("screenshot_huge")
    .openapi({ description: "Taille de l'image de couverture retournée" }),
});
