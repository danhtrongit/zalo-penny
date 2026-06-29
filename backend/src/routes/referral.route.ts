import { Router } from "express";
import { myReferral } from "../controllers/referral.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";

const router = Router();

router.get("/me", authMiddleware, asyncHandler(myReferral));

export default router;
