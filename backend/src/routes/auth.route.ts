import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { authLimiter } from "../middlewares/rate-limit.middleware";
import { loginBody, registerBody } from "../validators/auth.schema";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerBody }), asyncHandler(register));
router.post("/login", authLimiter, validate({ body: loginBody }), asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(me));

export default router;
