import { Router } from "express";
import { handleIPN } from "../controllers/payment.controller";

const router = Router();

router.post("/ipn", handleIPN);

export default router;
