import { z } from "zod";
import { registry } from "../registry";
import {
  createOneChallengeBodySchema,
  updateOneChallengeBodySchema,
  createOneParticipationWithinOneChallengeBodySchema,
} from "../../schemas/challenge.schemas";
import {
  PaginationOutputSchema,
  QueryChallengeOutputSchema,
  FindBestForHomePageQuerySchema,
} from "../../schemas/query.schemas";

const SlugParam = z.object({ slug: z.string().openapi({ example: "speedrun-zelda-botw-abc1" }) });

const ChallengeSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  hints: z.string().nullable(),
  demo: z.string().nullable(),
  goals: z.string().nullable(),
  closesAt: z.string().datetime().nullable(),
  status: z.enum(["active", "draft", "closed"]),
  votes: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ParticipationSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  video: z.string(),
  votes: z.number(),
  createdAt: z.string().datetime(),
});

const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

registry.registerPath({
  method: "get",
  path: "/challenges",
  tags: ["Challenges"],
  summary: "Liste paginée des challenges",
  request: {
    query: QueryChallengeOutputSchema.merge(PaginationOutputSchema),
  },
  responses: {
    200: {
      description: "Liste des challenges",
      content: {
        "application/json": { schema: PaginatedResponseSchema(ChallengeSchema) },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/challenges/home",
  tags: ["Challenges"],
  summary: "Meilleurs challenges pour la page d'accueil",
  request: { query: FindBestForHomePageQuerySchema },
  responses: {
    200: {
      description: "Challenges mis en avant",
      content: { "application/json": { schema: z.array(ChallengeSchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/challenges/{slug}",
  tags: ["Challenges"],
  summary: "Détail d'un challenge",
  request: { params: SlugParam },
  responses: {
    200: {
      description: "Challenge trouvé",
      content: { "application/json": { schema: ChallengeSchema } },
    },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "get",
  path: "/challenges/{slug}/participations",
  tags: ["Challenges"],
  summary: "Participations d'un challenge",
  request: {
    params: SlugParam,
    query: PaginationOutputSchema,
  },
  responses: {
    200: {
      description: "Liste des participations",
      content: {
        "application/json": { schema: PaginatedResponseSchema(ParticipationSchema) },
      },
    },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "post",
  path: "/challenges",
  tags: ["Challenges"],
  summary: "Créer un challenge",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createOneChallengeBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Challenge créé",
      content: { "application/json": { schema: ChallengeSchema } },
    },
    400: { description: "Données invalides" },
    401: { description: "Non authentifié" },
  },
});

registry.registerPath({
  method: "post",
  path: "/challenges/{slug}/participations",
  tags: ["Challenges"],
  summary: "Soumettre une participation à un challenge",
  security: [{ cookieAuth: [] }],
  request: {
    params: SlugParam,
    body: {
      required: true,
      content: {
        "application/json": { schema: createOneParticipationWithinOneChallengeBodySchema },
      },
    },
  },
  responses: {
    201: {
      description: "Participation créée",
      content: { "application/json": { schema: ParticipationSchema } },
    },
    401: { description: "Non authentifié" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/challenges/{slug}",
  tags: ["Challenges"],
  summary: "Modifier un challenge",
  security: [{ cookieAuth: [] }],
  request: {
    params: SlugParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateOneChallengeBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Challenge mis à jour",
      content: { "application/json": { schema: ChallengeSchema } },
    },
    401: { description: "Non authentifié" },
    403: { description: "Non autorisé" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/challenges/{slug}",
  tags: ["Challenges"],
  summary: "Supprimer un challenge",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    204: { description: "Challenge supprimé" },
    401: { description: "Non authentifié" },
    403: { description: "Non autorisé" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "post",
  path: "/challenges/{slug}/likes",
  tags: ["Challenges"],
  summary: "Liker un challenge",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Like ajouté" },
    401: { description: "Non authentifié" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/challenges/{slug}/likes",
  tags: ["Challenges"],
  summary: "Retirer son like d'un challenge",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Like retiré" },
    401: { description: "Non authentifié" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "post",
  path: "/challenges/{slug}/favorites",
  tags: ["Challenges"],
  summary: "Ajouter un challenge aux favoris",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Ajouté aux favoris" },
    401: { description: "Non authentifié" },
    404: { description: "Challenge introuvable" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/challenges/{slug}/favorites",
  tags: ["Challenges"],
  summary: "Retirer un challenge des favoris",
  security: [{ cookieAuth: [] }],
  request: { params: SlugParam },
  responses: {
    200: { description: "Retiré des favoris" },
    401: { description: "Non authentifié" },
    404: { description: "Challenge introuvable" },
  },
});
