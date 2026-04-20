import { Router } from "express";
import { getReport } from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getReport);

export default router;
