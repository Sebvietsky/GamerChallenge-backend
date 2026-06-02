import { Router } from "express";
import authRouter from "./auth.routes";
import challengeRouter from "./challenges.routes";
import gamesRouter from "./games.routes";

const router: Router = Router();

router.use("/auth", authRouter);
router.use("/challenges", challengeRouter);
router.use("/games", gamesRouter);

export default router;
