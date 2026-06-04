import { z } from "zod";

export const searchGamesQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(10),
  bannerSize: z.enum(["screenshot_huge", "1080p", "original"]).default("screenshot_huge"),
});
