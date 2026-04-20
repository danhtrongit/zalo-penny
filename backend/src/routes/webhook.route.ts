import { Router } from "express";
import { handleZaloWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/zalo/:botConfigId", handleZaloWebhook);

export default router;
