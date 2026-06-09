import { z } from "zod";
import { registry } from "../registry";
import { PaginationOutputSchema } from "../../schemas/query.schemas";

const ChallengeSlugSchema = z.object({
  id: z.number(),
  slug: z.string(),
  visibility: z.boolean(),
});

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

const ParticipationSlugSchema = z.object({
  id: z.number(),
  slug: z.string(),
  visibility: z.boolean(),
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

const DashboardSchema = z.object({
  totalParticipation: z.number(),
  totalChallengeCreated: z.number(),
  totalChallengeUserVoted: z.number(),
  totalParticipationUserVoted: z.number(),
  totalVote: z.number(),
  totalVoteReceivedOnChallenge: z.number(),
  totalVoteReceivedOnParticipation: z.number(),
  mostLikedChallenge: ChallengeSchema.nullable(),
  mostLikedParticipation: ParticipationSchema.nullable(),
});

registry.registerPath({
  method: "get",
  path: "/user/isFavorite",
  tags: ["User"],
  summary: "Slugs des challenges mis en favori",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Liste des slugs (et id/visibility) des challenges favoris",
      content: { "application/json": { schema: z.array(ChallengeSlugSchema) } },
    },
    401: { description: "Non authentifié" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/getFavorites",
  tags: ["User"],
  summary: "Challenges favoris de l'utilisateur connecté (paginés)",
  security: [{ cookieAuth: [] }],
  request: { query: PaginationOutputSchema },
  responses: {
    200: {
      description: "Liste des challenges favoris",
      content: { "application/json": { schema: z.array(ChallengeSchema) } },
    },
    401: { description: "Non authentifié" },
    404: { description: "Aucun favori" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/isLikedChallenge",
  tags: ["User"],
  summary: "Slugs des challenges likés par l'utilisateur connecté",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Liste des slugs (et id/visibility) des challenges likés",
      content: { "application/json": { schema: z.array(ChallengeSlugSchema) } },
    },
    401: { description: "Non authentifié" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/getLikedChallenges",
  tags: ["User"],
  summary: "Challenges likés par l'utilisateur connecté (paginés)",
  security: [{ cookieAuth: [] }],
  request: { query: PaginationOutputSchema },
  responses: {
    200: {
      description: "Liste des challenges likés",
      content: { "application/json": { schema: z.array(ChallengeSchema) } },
    },
    401: { description: "Non authentifié" },
    404: { description: "Aucun like" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/isLikedParticipation",
  tags: ["User"],
  summary: "Slugs des participations likées par l'utilisateur connecté",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Liste des slugs (et id/visibility) des participations likées",
      content: { "application/json": { schema: z.array(ParticipationSlugSchema) } },
    },
    401: { description: "Non authentifié" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/getLikedParticipations",
  tags: ["User"],
  summary: "Participations likées par l'utilisateur connecté (paginées)",
  security: [{ cookieAuth: [] }],
  request: { query: PaginationOutputSchema },
  responses: {
    200: {
      description: "Liste des participations likées",
      content: { "application/json": { schema: z.array(ParticipationSchema) } },
    },
    401: { description: "Non authentifié" },
    404: { description: "Aucun like" },
  },
});

registry.registerPath({
  method: "get",
  path: "/user/dashboard",
  tags: ["User"],
  summary: "Tableau de bord de l'utilisateur connecté",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Statistiques et highlights du profil utilisateur",
      content: { "application/json": { schema: DashboardSchema } },
    },
    401: { description: "Non authentifié" },
  },
});
