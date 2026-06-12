import { Router } from "express";
import { checkRoles } from "../middlewares/access-control.middleware";
import { UserRole } from "../lib/prisma";
import controller from "../controllers/participations.controller";

const router: Router = Router();

router.get("/trends", controller.findTrends);
router.get("/:slug", controller.findOneParticipationWithinOneChallenge);
router.post(
  "/:slug/vote",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userLikeParticipation
);
router.patch(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.updateOneParticipationWithinOneChallenge
);
router.delete(
  "/:slug/vote",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userUnlikeParticipation
);
router.delete(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.deleteOneParticipationWithinOneChallenge
);

export default router;
