import { Router } from "express";
import controller from "../controllers/auth.controller.ts";

const router: Router = Router();

router.post("/register", controller.registerUser);

export default router;
