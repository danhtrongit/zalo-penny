import { Router } from "express";
import { getBudgets, setBudget } from "../controllers/budget.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getBudgets);
router.post("/", authMiddleware, setBudget);

export default router;
