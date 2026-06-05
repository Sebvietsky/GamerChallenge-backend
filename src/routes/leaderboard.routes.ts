import { Router } from "express";
import gamesController from "../controllers/leaderboard.controller";

const router: Router = Router();

router.get("/bestChallenges", gamesController.mostPlayedChallenges);

router.get("/bestActivUsers", gamesController.mostActifUsers);

router.get("/bestParticipations", gamesController.mostAppreciateParticipationByCommunity);

export default router;
