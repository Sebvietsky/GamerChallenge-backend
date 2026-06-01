import { NotFoundError } from "../lib/errors.ts";

export function notFoundMiddleware() {
  throw new NotFoundError("Ressource not found");
}
