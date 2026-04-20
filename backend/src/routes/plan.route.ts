import { Router } from "express";
import { listPlans } from "../controllers/plan.controller";

const router = Router();

router.get("/", listPlans);

export default router;
