import { z } from "zod";
import { registry } from "../registry";
import { PaginationLeaderboardOutputSchema } from "../../schemas/query.schemas";

const ChallengeLeaderboardSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  votes: z.number(),
  participationCount: z.number(),
  game: z.object({ name: z.string(), cover: z.string().nullable() }),
});

const UserLeaderboardSchema = z.object({
  id: z.number(),
  username: z.string(),
  country: z.string().nullable(),
  profilePicture: z.string().nullable(),
  participationCount: z.number(),
  challengeCount: z.number(),
  totalActivity: z.number(),
});

const ParticipationLeaderboardSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  votes: z.number(),
  video: z.string(),
  user: z.object({ username: z.string(), profilePicture: z.string().nullable() }),
});

registry.registerPath({
  method: "get",
  path: "/leaderboard/bestChallenges",
  tags: ["Leaderboard"],
  summary: "Challenges les plus joués",
  request: { query: PaginationLeaderboardOutputSchema },
  responses: {
    200: {
      description: "Classement des challenges",
      content: { "application/json": { schema: z.array(ChallengeLeaderboardSchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/leaderboard/bestActivUsers",
  tags: ["Leaderboard"],
  summary: "Utilisateurs les plus actifs",
  request: { query: PaginationLeaderboardOutputSchema },
  responses: {
    200: {
      description: "Classement des utilisateurs",
      content: { "application/json": { schema: z.array(UserLeaderboardSchema) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/leaderboard/bestParticipations",
  tags: ["Leaderboard"],
  summary: "Participations les plus appréciées",
  request: { query: PaginationLeaderboardOutputSchema },
  responses: {
    200: {
      description: "Classement des participations",
      content: { "application/json": { schema: z.array(ParticipationLeaderboardSchema) } },
    },
  },
});
