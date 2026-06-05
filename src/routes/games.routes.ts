import { Router } from "express";
import gamesController from "../controllers/games.controller";

const router: Router = Router();

router.get("/", gamesController.findAll);

router.get("/search", gamesController.search);

router.get("/:igdbId", gamesController.findOne);

export default router;
