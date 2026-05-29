import { Router } from "express";
import controller from "../controllers/auth.controller.ts";
import { checkRoles } from "../middlewares/access-control.middleware.ts";
import { UserRole } from "../lib/prisma.ts";

const router: Router = Router();

router.post("/login", controller.loginUser);
router.post("/refresh", controller.refreshTokens);
router.post("/register", controller.registerUser);
router.post(
  "/logout",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.logoutUser,
);

export default router;
