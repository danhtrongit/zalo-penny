import { Router } from "express";
import { listPlans } from "../controllers/plan.controller";
import { asyncHandler } from "../middlewares/async-handler";

const router = Router();

router.get("/", asyncHandler(listPlans));

export default router;
