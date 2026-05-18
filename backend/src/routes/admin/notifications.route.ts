import { Router } from "express";
import * as ctrl from "../../controllers/admin/notifications.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import {
  broadcastBody,
  sendToUserBody,
  userIdParam,
} from "../../validators/admin.schema";

const router = Router();

router.post(
  "/broadcast",
  validate({ body: broadcastBody }),
  asyncHandler(ctrl.broadcast)
);
router.post(
  "/send-to/:userId",
  validate({ params: userIdParam, body: sendToUserBody }),
  asyncHandler(ctrl.sendToUser)
);

export default router;
