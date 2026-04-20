import { Router } from "express";
import {
  createSubscription,
  mySubscription,
} from "../controllers/subscription.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createSubscription);
router.get("/mine", authMiddleware, mySubscription);

export default router;
