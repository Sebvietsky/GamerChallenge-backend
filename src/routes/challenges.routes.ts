import { Router } from "express";
import controller from "../controllers/challenges.controller";
import { checkRoles } from "../middlewares/access-control.middleware";
import { UserRole } from "../lib/prisma";

const router: Router = Router();

router.get("/", controller.findAll);
router.get("/home", controller.findBest);
router.get("/:slug", controller.findOne);
router.get("/:slug/participations", controller.findAllParticipationsWithinOneChallenge);
router.post(
  "/",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.createOne
);
router.post(
  "/:slug/participations",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.createOneParticipationWithinOneChallenge
);
router.patch(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.updateOne
);
router.delete(
  "/:slug",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.deleteOne
);
// Favorites & Likes
router.post(
  "/:slug/likes",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userLikeChallenge
);
router.post(
  "/:slug/favorites",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userAddChallengeToFavorites
);
router.delete(
  "/:slug/likes",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userUnlikeChallenge
);
router.delete(
  "/:slug/favorites",
  checkRoles([UserRole.admin, UserRole.moderator, UserRole.user]),
  controller.userDeleteChallengeFromHisFavorites
);

export default router;
