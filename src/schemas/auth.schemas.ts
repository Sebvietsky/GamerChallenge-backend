import z from "zod";

export const passwordSchema = z
  .string()
  .min(12)
  .max(100)
  .regex(/[a-z]/, "Password must contain at least one lowercase caracter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase caracter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginUserBodySchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const resetPasswordBodySchema = z
  .object({
    currentPassword: z.string(),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.newPassword === data.confirm, {
    message: "New passwords doesn't match",
    path: ["confirm"],
  });

export const registerUserBodySchema = z
  .object({
    username: z.string().min(2),
    email: z.email(),
    password: passwordSchema,
    confirm: z.string(),
    country: z.string().optional(),
    bio: z.string().optional(),
    profilePicture: z.string().optional(),
  })
  // https://v3.zod.dev/?id=refine
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"], // l'erreur sera attachée à ce champ
  });
