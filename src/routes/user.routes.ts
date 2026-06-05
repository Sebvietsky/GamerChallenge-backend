import { Router } from "express";
import controller from "../controllers/user.controller.ts";
import { checkRoles } from "../middlewares/access-control.middleware.ts";
import { UserRole } from "../lib/prisma.ts";

const router: Router = Router();

router.get(
  "/getFavorites",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getFavorites
);
router.get(
  "/isFavorite",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getFavoritesSlugs
);
router.get(
  "/isLikedChallenge",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getLikedChallengesSlugs
);
router.get(
  "/getLikedChallenges",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getLikedChallenges
);
router.get(
  "/isLikedParticipation",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getLikedParticipationsSlugs
);
router.get(
  "/getLikedParticipations",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getLikedParticipations
);
router.get(
  "/dashboard",
  checkRoles([UserRole.user, UserRole.moderator, UserRole.admin]),
  controller.getDashboard
);

export default router;
