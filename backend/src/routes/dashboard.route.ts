import { Router } from "express";
import { getStats, getRecent } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";

const router = Router();

router.use(authMiddleware);

router.get("/stats", asyncHandler(getStats));
router.get("/recent", asyncHandler(getRecent));

export default router;
