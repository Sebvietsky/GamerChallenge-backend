import z from "zod";
import { BadRequestError } from "../lib/errors";

export async function parseIdFromParams(id: string) {
  return await z.coerce.number().int().min(1).parseAsync(id);
}

export function generateSlug(title: string, username?: string): string {
  if (username) {
    const slug =
      title
        .trim()
        .toLowerCase()

        // Supprime les accents (é -> e, à -> a, etc.)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        // Remplace les apostrophes par rien
        .replace(/['’]/g, "")

        // Remplace tout ce qui n'est pas lettre/chiffre par un espace
        .replace(/[^a-z0-9]+/g, "-")

        // Évite les --- successifs
        .replace(/-+/g, "-")

        // Supprime les - au début et à la fin
        .replace(/^-|-$/g, "") +
      username
        .trim()
        .toLowerCase()

        // Supprime les accents (é -> e, à -> a, etc.)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        // Remplace les apostrophes par rien
        .replace(/['’]/g, "")

        // Remplace tout ce qui n'est pas lettre/chiffre par un espace
        .replace(/[^a-z0-9]+/g, "-")

        // Évite les --- successifs
        .replace(/-+/g, "-")

        // Supprime les - au début et à la fin
        .replace(/^-|-$/g, "");
    if (!slug) throw new BadRequestError("Invalid Username or Title.");
    return slug || "untitled";
  } else {
    const slug = title
      .trim()
      .toLowerCase()

      // Supprime les accents (é -> e, à -> a, etc.)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

      // Remplace les apostrophes par rien
      .replace(/['’]/g, "")

      // Remplace tout ce qui n'est pas lettre/chiffre par un espace
      .replace(/[^a-z0-9]+/g, "-")

      // Évite les --- successifs
      .replace(/-+/g, "-")

      // Supprime les - au début et à la fin
      .replace(/^-|-$/g, "");

    if (!slug) throw new BadRequestError("Invalid Title");
    return slug;
  }
}
