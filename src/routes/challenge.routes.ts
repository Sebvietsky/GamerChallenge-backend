import { Router } from "express";
import controller from "../controllers/challenges.controller";

const router: Router = Router();

router.get("/", controller.findAll);
router.get("/:slug", controller.findOne);
router.post("/", controller.createOne);
router.patch("/:slug", controller.updateOne);
router.delete("/:slug", controller.deleteOne);

export default router;
