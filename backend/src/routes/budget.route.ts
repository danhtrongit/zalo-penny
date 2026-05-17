import { Router } from "express";
import { getBudgets, setBudget } from "../controllers/budget.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { setBudgetBody } from "../validators/budget.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(getBudgets));
router.post("/", validate({ body: setBudgetBody }), asyncHandler(setBudget));

export default router;
