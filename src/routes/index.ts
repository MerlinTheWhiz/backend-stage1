import { Router } from "express";
import profileRoutes from "../modules/profile/profile.routes";
import authRoutes from "../modules/auth/auth.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);

export { router };
