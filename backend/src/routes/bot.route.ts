import { Router } from "express";
import { connectBot, disconnectBot, botStatus, verifyBotOwnership } from "../controllers/bot.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/connect", authMiddleware, connectBot);
router.post("/verify", authMiddleware, verifyBotOwnership);
router.post("/disconnect", authMiddleware, disconnectBot);
router.get("/status", authMiddleware, botStatus);

export default router;
