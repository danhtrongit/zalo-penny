import { Router } from "express";
import { getStats, getRecent } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/stats", authMiddleware, getStats);
router.get("/recent", authMiddleware, getRecent);

export default router;
