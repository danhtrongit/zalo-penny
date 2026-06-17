import { Router } from "express";
import {
  connectBot,
  disconnectBot,
  botStatus,
  verifyBotOwnership,
  claimFreeBot,
  migrateToPool,
} from "../controllers/bot.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { connectBotBody, verifyBotBody, migrateBotBody } from "../validators/bot.schema";

const router = Router();

router.use(authMiddleware);

router.post("/free", asyncHandler(claimFreeBot));
router.post("/connect", validate({ body: connectBotBody }), asyncHandler(connectBot));
router.post("/verify", validate({ body: verifyBotBody }), asyncHandler(verifyBotOwnership));
router.post("/migrate-to-pool", validate({ body: migrateBotBody }), asyncHandler(migrateToPool));
router.post("/disconnect", asyncHandler(disconnectBot));
router.get("/status", asyncHandler(botStatus));

export default router;
