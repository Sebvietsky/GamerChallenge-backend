import { z } from "zod";
import { registry } from "../registry";
import { searchGamesQuerySchema } from "../../schemas/games.schemas";
import { PaginationOutputSchema } from "../../schemas/query.schemas";

const IgdbIdParam = z.object({
  igdbId: z.coerce.number().openapi({ example: 1942, description: "Identifiant IGDB du jeu" }),
});

const GameSchema = z.object({
  id: z.number(),
  igdbId: z.number(),
  name: z.string(),
  summary: z.string().nullable(),
  cover: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  platforms: z.array(z.string()).nullable(),
  genres: z.array(z.string()).nullable(),
  developer: z.string().nullable(),
});

const IGDBGameSchema = z.object({
  id: z
    .number()
    .openapi({ description: "ID IGDB — à passer dans igdbId lors de la création d'un challenge" }),
  name: z.string(),
  summary: z.string().optional(),
  cover: z.object({ url: z.string() }).optional(),
  platforms: z.array(z.object({ name: z.string() })).optional(),
  genres: z.array(z.object({ name: z.string() })).optional(),
});

registry.registerPath({
  method: "get",
  path: "/games",
  tags: ["Games"],
  summary: "Catalogue de jeux avec challenges",
  description: "Liste uniquement les jeux pour lesquels au moins un challenge existe en base.",
  request: { query: PaginationOutputSchema },
  responses: {
    200: {
      description: "Liste paginée de jeux",
      content: { "application/json": { schema: z.array(GameSchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/games/search",
  tags: ["Games"],
  summary: "Rechercher des jeux sur IGDB",
  description:
    "Interroge l'API IGDB sans persister en base. Utilisé pour l'autocomplétion lors de la création d'un challenge. Chaque résultat contient un `id` (igdbId) à transmettre au `POST /challenges`.",
  request: { query: searchGamesQuerySchema },
  responses: {
    200: {
      description: "Résultats IGDB",
      content: { "application/json": { schema: z.array(IGDBGameSchema) } },
    },
    400: { description: "Paramètre `q` manquant ou invalide" },
  },
});

registry.registerPath({
  method: "get",
  path: "/games/{igdbId}",
  tags: ["Games"],
  summary: "Détail d'un jeu et ses challenges",
  description:
    "Récupère un jeu via son igdbId. Retourne 404 si aucun challenge n'existe encore pour ce jeu.",
  request: { params: IgdbIdParam },
  responses: {
    200: {
      description: "Jeu avec ses challenges",
      content: { "application/json": { schema: GameSchema } },
    },
    404: { description: "Jeu introuvable (pas encore de challenge pour ce jeu)" },
  },
});
