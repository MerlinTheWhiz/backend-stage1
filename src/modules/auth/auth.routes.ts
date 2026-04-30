import { Router } from "express";
import { AuthController } from "./auth.controller";
import { rateLimit } from "express-rate-limit";

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    status: "error",
    message: "Too many authentication requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/github", authRateLimit, AuthController.githubAuth);
router.get("/github/callback", authRateLimit, AuthController.githubCallback);
router.get(
  "/github/cli-callback",
  authRateLimit,
  AuthController.githubCLICallback,
);
router.post("/github/device", authRateLimit, AuthController.githubDeviceAuth);
router.post("/refresh", authRateLimit, AuthController.refreshToken);
router.post("/logout", authRateLimit, AuthController.logout);

export default router;
