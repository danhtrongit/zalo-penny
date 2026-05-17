import { Router } from "express";
import { handleIPN } from "../controllers/payment.controller";
import { asyncHandler } from "../middlewares/async-handler";

const router = Router();

// Note: IPN is hit only by SePay (IP whitelist + HMAC). The general rate
// limiter (120/min) on /api is fine — SePay won't burst that hard.
router.post("/ipn", asyncHandler(handleIPN));

export default router;
