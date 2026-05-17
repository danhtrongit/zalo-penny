import { Router } from "express";
import { listUsers, broadcastMessage } from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { broadcastBody, listUsersQuery } from "../validators/admin.schema";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/users", validate({ query: listUsersQuery }), asyncHandler(listUsers));
router.post(
  "/broadcast",
  validate({ body: broadcastBody }),
  asyncHandler(broadcastMessage)
);

export default router;
