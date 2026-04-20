import { Router } from "express";
import { listUsers, broadcastMessage } from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/users", authMiddleware, adminMiddleware, listUsers);
router.post("/broadcast", authMiddleware, adminMiddleware, broadcastMessage);

export default router;
