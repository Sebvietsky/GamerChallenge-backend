import z from "../lib/zod";

export const passwordSchema = z
  .string()
  .min(12)
  .max(100)
  .regex(/[a-z]/, "Password must contain at least one lowercase caracter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase caracter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .openapi({
    description:
      "12 à 100 caractères, doit contenir au moins une majuscule, une minuscule et un chiffre",
  });

export const loginUserBodySchema = z.object({
  email: z.email().openapi({ example: "joueur@example.com" }),
  password: z.string().openapi({ example: "MonMotDePasse1" }),
});

export const resetPasswordBodySchema = z
  .object({
    currentPassword: z.string().openapi({ description: "Mot de passe actuel" }),
    newPassword: passwordSchema,
    confirm: z.string().openapi({ description: "Doit être identique à newPassword" }),
  })
  .refine((data) => data.newPassword === data.confirm, {
    message: "New passwords doesn't match",
    path: ["confirm"],
  });

export const updateUserBodySchema = z
  .object({
    username: z
      .string()
      .min(2)
      .optional()
      .openapi({ description: "Pseudo unique, minimum 2 caractères" }),
    email: z.email().optional().openapi({ example: "joueur@example.com" }),
    country: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: "Optionnel, null pour effacer" }),
    bio: z.string().nullable().optional().openapi({ description: "Optionnel, null pour effacer" }),
    profilePicture: z
      .string()
      .nullable()
      .optional()
      .openapi({ description: "URL de la photo de profil, null pour effacer" }),
    visibility: z.boolean().optional().openapi({ description: "Visibilité du profil" }),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const registerUserBodySchema = z
  .object({
    username: z
      .string()
      .min(2)
      .openapi({ description: "Pseudo unique, minimum 2 caractères", example: "LinkRunner" }),
    email: z.email().openapi({ example: "joueur@example.com" }),
    password: passwordSchema,
    confirm: z.string().openapi({ description: "Doit être identique à password" }),
    country: z.string().optional().openapi({ description: "Optionnel", example: "France" }),
    bio: z.string().optional().openapi({ description: "Optionnel" }),
    profilePicture: z
      .string()
      .optional()
      .openapi({ description: "URL de la photo de profil (optionnel)" }),
    acceptCgu: z
      .literal(true)
      .openapi({ description: "Doit être à true pour valider l'inscription" }),
  })
  // https://v3.zod.dev/?id=refine
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"], // l'erreur sera attachée à ce champ
  });
