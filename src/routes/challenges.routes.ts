import { Router } from "express";
import controller from "../controllers/challenges.controller.ts";

const router: Router = Router();

router.get("/", controller.findAll);

export default router;
