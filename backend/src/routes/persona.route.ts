import { Router } from "express";
import { getPersona, updatePersona } from "../controllers/persona.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getPersona);
router.put("/", authMiddleware, updatePersona);

export default router;
