import { Router } from "express";
import difficultiesController from "../controllers/difficulties.controller";

const router: Router = Router();

router.get("/", difficultiesController.findAll);

export default router;
