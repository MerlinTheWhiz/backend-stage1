import { Router } from "express";
import * as controller from "./profile.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createProfileSchema } from "./profile.validation";
import { asyncHandler } from "../../middlewares/asyncHandler";

const router = Router();

router.post(
  "/",
  validate(createProfileSchema),
  asyncHandler(controller.createProfile),
);

router.get("/", asyncHandler(controller.getProfiles));
router.get("/:id", asyncHandler(controller.getProfileById));
router.delete("/:id", asyncHandler(controller.deleteProfile));

export default router;