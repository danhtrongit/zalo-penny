import { Router } from "express";
import { handleZaloWebhook } from "../controllers/webhook.controller";
import { asyncHandler } from "../middlewares/async-handler";

const router = Router();

router.post("/zalo/:botConfigId", asyncHandler(handleZaloWebhook));

export default router;
