import { Router } from "express";
import * as ctrl from "../../controllers/admin/settings.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import { commissionUpdateBody } from "../../validators/admin.schema";

const router = Router();

router.get("/", asyncHandler(ctrl.getSettings));
router.patch(
  "/commission",
  validate({ body: commissionUpdateBody }),
  asyncHandler(ctrl.updateCommission)
);

export default router;
