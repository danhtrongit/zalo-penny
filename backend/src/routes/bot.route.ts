import { Router } from "express";
import {
  connectBot,
  disconnectBot,
  botStatus,
  verifyBotOwnership,
} from "../controllers/bot.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { connectBotBody, verifyBotBody } from "../validators/bot.schema";

const router = Router();

router.use(authMiddleware);

router.post("/connect", validate({ body: connectBotBody }), asyncHandler(connectBot));
router.post("/verify", validate({ body: verifyBotBody }), asyncHandler(verifyBotOwnership));
router.post("/disconnect", asyncHandler(disconnectBot));
router.get("/status", asyncHandler(botStatus));

export default router;
