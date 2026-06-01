import z from "zod";

export const PaginationOutputSchema = z.object({
  page: z.coerce.number<number>().min(1),
  limit: z.coerce.number<number>().min(1).max(100),
});

export type PaginationParams = z.infer<typeof PaginationOutputSchema>;
