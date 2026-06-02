import { Router } from "express";
import controller from "../controllers/challenges.controller";
import { checkRoles } from "../middlewares/access-control.middleware";
import { UserRole } from "../lib/prisma";

const router: Router = Router();

router.get("/", controller.findAll);
router.get("/:slug", controller.findOne);
router.post(
  "/",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.createOne,
);
router.patch(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.updateOne,
);
router.delete(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.deleteOne,
);

export default router;
