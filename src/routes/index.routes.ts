import { Router } from "express";
import authRouter from "./auth.routes";
import challengeRouter from "./challenges.routes";
import gamesRouter from "./games.routes";
import participationsRouter from "./participations.routes";
import leaderboardRouter from "./leaderboard.routes";
import userRouter from "./user.routes";
import categoriesRouter from "./categories.routes";
import difficultiesRouter from "./difficulties.routes";

const router: Router = Router();

// Sonde de disponibilite. Volontairement sans acces base : elle sert au
// health check de l'hebergeur et au ping anti-mise-en-veille, deux appels
// frequents qui n'ont pas a reveiller la base ni a consommer du quota.
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

router.use("/auth", authRouter);
router.use("/challenges", challengeRouter);
router.use("/games", gamesRouter);
router.use("/participations", participationsRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/user", userRouter);
router.use("/categories", categoriesRouter);
router.use("/difficulties", difficultiesRouter);

export default router;
