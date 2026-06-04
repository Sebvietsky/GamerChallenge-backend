import z from "zod";

/*
    video          String              @db.VarChar(255)
    title          String              @db.VarChar(200)
    description    String?             @db.Text
    challengeId    Int                 @map("challenge_id")
    userId         Int                 @map("user_id")
*/
export const updateOneParticipationWithinOneChallengeBodySchema = z.object({
  video: z.string().min(2).optional(),
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  challengeId: z.coerce.number().min(1).optional(),
  userId: z.coerce.number().min(1).optional(),
});
