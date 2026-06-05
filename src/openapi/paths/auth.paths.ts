import { z } from "zod";
import { registry } from "../registry";
import {
  loginUserBodySchema,
  registerUserBodySchema,
  resetPasswordBodySchema,
} from "../../schemas/auth.schemas";

const MessageResponseSchema = z.object({ message: z.string() });

const TokenSchema = z.object({
  token: z.string(),
  expiresInMS: z.number(),
});

const SafeUserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  country: z.string().nullable(),
  bio: z.string().nullable(),
  profilePicture: z.string().nullable(),
  role: z.enum(["admin", "moderator", "user"]),
  visibility: z.boolean(),
  status: z.enum(["active", "banned", "inactive"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Créer un compte",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: registerUserBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Compte créé avec succès",
      content: { "application/json": { schema: MessageResponseSchema } },
    },
    400: { description: "Données invalides (validation Zod)" },
    409: { description: "Email ou username déjà utilisé" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Se connecter",
  description: "Renvoie les tokens JWT dans des cookies HTTP-only (`accessToken`, `refreshToken`).",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: loginUserBodySchema } },
    },
  },
  responses: {
    204: { description: "Connexion réussie — cookies positionnés" },
    401: { description: "Email ou mot de passe incorrect" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Rafraîchir les tokens",
  description: "Lit le cookie `refreshToken` et génère une nouvelle paire de tokens.",
  responses: {
    200: {
      description: "Nouveaux tokens générés",
      content: {
        "application/json": {
          schema: z.object({ accessToken: TokenSchema, refreshToken: TokenSchema }),
        },
      },
    },
    401: { description: "Refresh token absent, invalide ou expiré" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/resetPassword",
  tags: ["Auth"],
  summary: "Changer son mot de passe",
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: resetPasswordBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Mot de passe mis à jour",
      content: { "application/json": { schema: MessageResponseSchema } },
    },
    401: { description: "Mot de passe actuel incorrect ou non authentifié" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Se déconnecter",
  security: [{ cookieAuth: [] }],
  responses: {
    204: { description: "Déconnexion réussie — cookies supprimés" },
    401: { description: "Non authentifié" },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Profil de l'utilisateur connecté",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Données de l'utilisateur connecté",
      content: {
        "application/json": {
          schema: z.object({ userWithoutPassword: SafeUserResponseSchema }),
        },
      },
    },
    401: { description: "Non authentifié" },
  },
});
