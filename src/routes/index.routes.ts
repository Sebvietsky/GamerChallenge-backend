import { Router } from "express";
import authRouter from "./auth.routes";
import challengeRouter from "./challenges.routes";

const router: Router = Router();

router.use("/auth", authRouter);
router.use("/challenges", challengeRouter);

export default router;
