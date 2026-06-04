import z from "../lib/zod";

/*
  title               String          @db.VarChar(200) => Dans le body
  description         String          @db.Text
  hints               String?         @db.Text
  demo                String?         @db.VarChar(255)
  goals               String?         @db.Text
  closesAt            DateTime?       @map("closes_at") @db.Timestamptz()
  gameId              Int             @map("game_id")
  challengeCategoryId Int             @map("challenge_category_id")
  difficultyId        Int             @map("difficulty_id")
}
*/

export const createOneChallengeBodySchema = z.object({
  title: z
    .string()
    .min(2)
    .openapi({
      description: "Titre du challenge, minimum 2 caractères",
      example: "Speedrun Zelda BOTW any%",
    }),
  description: z.string().min(2).openapi({ description: "Description complète du challenge" }),
  hints: z
    .string()
    .min(2)
    .optional()
    .openapi({ description: "Indice(s) pour aider les participants (optionnel)" }),
  demo: z
    .string()
    .min(2)
    .optional()
    .openapi({ description: "URL d'une démo ou vidéo de référence (optionnel)" }),
  goals: z.string().min(2).optional().openapi({ description: "Objectifs à atteindre (optionnel)" }),
  closesAt: z.coerce
    .date()
    .optional()
    .openapi({
      description: "Date de clôture du challenge (optionnel)",
      example: "2026-12-31T23:59:59Z",
    }),
  igdbId: z.coerce
    .number()
    .int()
    .min(1)
    .openapi({ description: "ID IGDB du jeu — récupéré via GET /games/search", example: 1942 }),
  challengeCategoryId: z.coerce
    .number()
    .int()
    .min(1)
    .openapi({ description: "ID de la catégorie du challenge", example: 1 }),
  difficultyId: z.coerce
    .number()
    .int()
    .min(1)
    .openapi({ description: "ID de la difficulté", example: 2 }),
  status: z
    .enum(["active", "draft"])
    .default("active")
    .openapi({ description: "`active` = visible publiquement, `draft` = brouillon" }),
});

export const updateOneChallengeBodySchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  hints: z.string().min(2).optional(),
  demo: z.string().min(2).optional(),
  goals: z.string().min(2).optional(),
  closesAt: z.coerce.date().optional(),
  igdbId: z.coerce.number().int().min(1).optional(),
  challengeCategoryId: z.coerce.number().int().min(1).optional(),
  difficultyId: z.coerce.number().int().min(1).optional(),
  status: z.enum(["active", "draft"]).optional(),
});

export type updateOneChallengeParams = z.input<typeof updateOneChallengeBodySchema>;

export const createOneParticipationWithinOneChallengeBodySchema = z.object({
  title: z
    .string()
    .min(2)
    .openapi({ description: "Titre de la participation", example: "Mon run en 4h32" }),
  description: z.string().min(2).openapi({ description: "Description de la participation" }),
  video: z
    .string()
    .min(2)
    .openapi({
      description: "URL de la vidéo de démonstration",
      example: "https://www.youtube.com/watch?v=xxx",
    }),
});
