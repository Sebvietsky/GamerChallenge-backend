import z from "zod";

export const PaginationOutputSchema = z.object({
  page: z.coerce.number<number>().min(1).default(1),
  limit: z.coerce.number<number>().min(1).max(100).default(20),
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
  closesAfter: z.coerce.date().optional(),
  closesBefore: z.coerce.date().optional(),
  orderBy: z
    .enum(["title", "createdAt", "closesAt", "status", "votes", "participations"])
    .optional(),
  sort: z.enum(["asc", "desc"]).default("asc"),
});

export type PaginationParams = z.infer<typeof PaginationOutputSchema>;
export type QueryChallengeParams = z.infer<typeof QueryChallengeOutputSchema>;
