import type { ReqUser } from "../lib/interface.ts";

declare global {
  namespace Express {
    interface Request {
      user: ReqUser;
    }
  }
}

export {};
