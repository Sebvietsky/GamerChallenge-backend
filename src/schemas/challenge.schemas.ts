import z from "zod";

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
  title: z.string().min(2),
  description: z.string().min(2),
  hints: z.string().min(2).optional(),
  demo: z.string().min(2).optional(),
  goals: z.string().min(2).optional(),
  closesAt: z.coerce.date().optional(),
  igdbId: z.coerce.number().int().min(1),
  challengeCategoryId: z.coerce.number().int().min(1),
  difficultyId: z.coerce.number().int().min(1),
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
});

export type updateOneChallengeParams = z.input<
  typeof updateOneChallengeBodySchema
>;
