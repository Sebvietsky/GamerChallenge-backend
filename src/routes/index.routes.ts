import { Router } from "express";
import authRouter from "./auth.routes";
import challengeRouter from "./challenges.routes";
import gamesRouter from "./games.routes";
import participationsRouter from "./participations.routes";
import leaderboardRouter from "./leaderboard.routes";

const router: Router = Router();

router.use("/auth", authRouter);
router.use("/challenges", challengeRouter);
router.use("/games", gamesRouter);
router.use("/participations", participationsRouter);
router.use("/leaderboard", leaderboardRouter);

export default router;
