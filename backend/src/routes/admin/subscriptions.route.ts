import { Router } from "express";
import * as ctrl from "../../controllers/admin/subscriptions.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import {
  auditListQuery,
  manualUpgradeBody,
  userIdParam,
} from "../../validators/admin.schema";

const router = Router();

router.post(
  "/users/:userId/upgrade",
  validate({ params: userIdParam, body: manualUpgradeBody }),
  asyncHandler(ctrl.manualUpgrade)
);
router.get(
  "/audit",
  validate({ query: auditListQuery }),
  asyncHandler(ctrl.auditList)
);

export default router;
