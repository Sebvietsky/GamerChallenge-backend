import { z } from "zod";
import { registry } from "../registry";
import { updateOneParticipationWithinOneChallengeBodySchema } from "../../schemas/participations.schema";

const SlugParam = z.object({
  slug: z.string().openapi({ example: "ma-participation-abc1" }),
});

const ParticipationSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  video: z.string(),
  votes: z.number(),
  challengeId: z.number(),
  userId: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registry.registerPath({
  method: "get",
  path: "/participations/{slug}",
  tags: ["Participations"],
  summary: "Détail d'une participation",
  request: { params: SlugParam },
  responses: {
    200: {
      description: "Participation trouvée",
      content: { "application/json": { schema: ParticipationSchema } },
    },
    404: { description: "Participation introuvable" },
  },
});

registry.registerPath({
  method: "post",
  path: "/participations/{slug}/vote",
  tags: ["Participations"],
  summary: "Voter pour une participation",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Vote enregistré" },
    401: { description: "Non authentifié" },
    404: { description: "Participation introuvable" },
    409: { description: "Vote déjà existant" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/participations/{slug}/vote",
  tags: ["Participations"],
  summary: "Retirer son vote d'une participation",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Vote retiré" },
    401: { description: "Non authentifié" },
    404: { description: "Vote ou participation introuvable" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/participations/{slug}",
  tags: ["Participations"],
  summary: "Modifier une participation",
  security: [{ cookieAuth: [] }],
  request: {
    params: SlugParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: updateOneParticipationWithinOneChallengeBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Participation mise à jour",
      content: { "application/json": { schema: ParticipationSchema } },
    },
    401: { description: "Non authentifié" },
    403: { description: "Non autorisé (pas votre participation)" },
    404: { description: "Participation introuvable" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/participations/{slug}",
  tags: ["Participations"],
  summary: "Supprimer une participation",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    204: { description: "Participation supprimée" },
    401: { description: "Non authentifié" },
    403: { description: "Non autorisé" },
    404: { description: "Participation introuvable" },
  },
});
