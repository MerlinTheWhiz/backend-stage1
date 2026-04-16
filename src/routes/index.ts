import { Router } from "express";
import profileRoutes from "../modules/profile/profile.routes";

const router = Router();

router.use("/profiles", profileRoutes);

export { router };