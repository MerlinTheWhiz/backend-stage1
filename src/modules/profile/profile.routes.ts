import { Router } from "express";
import * as controller from "./profile.controller";
import { validate } from "../../middlewares/validate.middleware";
import { createProfileSchema } from "./profile.validation";
import { asyncHandler } from "../../middlewares/asyncHandler";
import {
  authenticateToken,
  requireAdmin,
  requireAnalyst,
} from "../../middlewares/auth.middleware";
import { rateLimit } from "express-rate-limit";

const router = Router();

const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per user
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
});

// Apply API versioning middleware
router.use((req, res, next) => {
  const apiVersion = req.headers["x-api-version"];
  if (!apiVersion) {
    return res.status(400).json({
      status: "error",
      message: "API version header required",
    });
  }
  if (apiVersion !== "1") {
    return res.status(400).json({
      status: "error",
      message: "Unsupported API version",
    });
  }
  next();
});

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(apiRateLimit);

router.post(
  "/",
  requireAdmin,
  validate(createProfileSchema),
  asyncHandler(controller.createProfile),
);

// Search MUST come before :id to avoid "search" being captured as an id param
router.get("/search", requireAnalyst, asyncHandler(controller.searchProfiles));
router.get("/", requireAnalyst, asyncHandler(controller.getProfiles));
router.get("/export", requireAnalyst, asyncHandler(controller.exportProfiles));
router.get("/:id", requireAnalyst, asyncHandler(controller.getProfileById));
router.delete("/:id", requireAdmin, asyncHandler(controller.deleteProfile));

export default router;
