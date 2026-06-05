import z from "../lib/zod";

export const PaginationOutputSchema = z.object({
  page: z.coerce
    .number<number>()
    .min(1)
    .default(1)
    .openapi({ description: "Numéro de page (défaut: 1)" }),
  limit: z.coerce
    .number<number>()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ description: "Résultats par page, max 100 (défaut: 20)" }),
});

export const PaginationLeaderboardOutputSchema = z.object({
  page: z.coerce
    .number<number>()
    .min(1)
    .default(1)
    .openapi({ description: "Numéro de page (défaut: 1)" }),
  limit: z.coerce
    .number<number>()
    .min(1)
    .max(100)
    .default(3)
    .openapi({ description: "Résultats par page, max 100 (défaut: 3)" }),
  since: z
    .enum(["1w", "1m", "3m", "6m", "1y"])
    .optional()
    .openapi({ description: "Période : 1 semaine, 1 mois, 3 mois, 6 mois ou 1 an" }),
});

export const QueryChallengeOutputSchema = z.object({
  search: z.string().trim().min(1).optional(),
  /*
    Certaines catégories contiennent des espaces (ex: "No Hit", "Score Attack").
    Express décode automatiquement les query params reçus : %20 → espace, donc ça fonctionne
    normalement dans un navigateur ou un vrai appel HTTP.
    Attention dans les clients REST (Bruno, Postman, Insomnia) : il faut saisir la valeur
    telle quelle ("No Hit") dans le champ dédié au paramètre, et laisser le client
    gérer l'encodage. Écrire manuellement "No%20Hit" dans le champ provoque un double
    encodage (%2520) et la validation Zod échoue.
  */
  category: z
    .enum([
      "Speedrun",
      "No Hit",
      "Score Attack",
      "Cosplay Run",
      "Créativité",
      "PvP",
      "Coopératif",
      "Low%",
    ])
    .optional(),
  game: z.string().trim().min(1).optional(),
  difficulty: z.enum(["Facile", "Moyen", "Difficile", "Expert", "Légendaire"]).optional(),
  creator: z.string().trim().min(1).optional(),
  status: z.enum(["active", "closed"]).optional(),
  since: z.enum(["1w", "1m", "3m", "6m", "1y"]).optional(),
  closesAfter: z.coerce.date().optional(),
  closesBefore: z.coerce.date().optional(),
  orderBy: z
    .enum(["title", "createdAt", "closesAt", "status", "votes", "participations"])
    .optional(),
  sort: z.enum(["asc", "desc"]).default("asc"),
});

export const FindBestForHomePageQuerySchema = z.object({
  since: z
    .enum(["1w", "1m", "3m", "6m", "1y"])
    .optional()
    .openapi({ description: "Filtre par période" }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .openapi({ description: "Nombre de challenges retournés, max 20 (défaut: 5)" }),
  sortBy: z
    .enum(["votes", "participations", "createdAt"])
    .default("votes")
    .openapi({ description: "Critère de tri (défaut: votes)" }),
});

export type PaginationParams = z.infer<typeof PaginationOutputSchema>;
export type PaginationLeaderboardParams = z.infer<typeof PaginationLeaderboardOutputSchema>;
export type QueryChallengeParams = z.infer<typeof QueryChallengeOutputSchema>;
export type FindBestForHomePageQueryParams = z.infer<typeof FindBestForHomePageQuerySchema>;
