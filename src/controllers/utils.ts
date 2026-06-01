import z from "zod";

export async function parseIdFromParams(id: string) {
  return await z.coerce.number().int().min(1).parseAsync(id);
}
