import { Router } from "express";
import controller from "../controllers/auth.controller.ts";

const router: Router = Router();

router.post("/login", controller.loginUser);
router.post("/refresh", controller.refreshTokens);

export default router;
