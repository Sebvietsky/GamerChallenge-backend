import z from "../lib/zod";

export const updateOneParticipationWithinOneChallengeBodySchema = z.object({
  video: z.string().min(2).optional().openapi({ description: "Nouvelle URL vidéo (optionnel)" }),
  title: z.string().min(2).optional().openapi({ description: "Nouveau titre (optionnel)" }),
  description: z
    .string()
    .min(2)
    .optional()
    .openapi({ description: "Nouvelle description (optionnel)" }),
  challengeId: z.coerce
    .number()
    .min(1)
    .optional()
    .openapi({ description: "ID du challenge (optionnel)" }),
  userId: z.coerce
    .number()
    .min(1)
    .optional()
    .openapi({ description: "ID de l'utilisateur (optionnel)" }),
});
