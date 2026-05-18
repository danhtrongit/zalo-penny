import { Router } from "express";
import * as ctrl from "../../controllers/admin/plans.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import {
  planCreateBody,
  planIdParams,
  planUpdateBody,
} from "../../validators/admin.schema";

const router = Router();

router.get("/", asyncHandler(ctrl.list));
router.post("/", validate({ body: planCreateBody }), asyncHandler(ctrl.create));
router.patch(
  "/:id",
  validate({ params: planIdParams, body: planUpdateBody }),
  asyncHandler(ctrl.update)
);
router.delete(
  "/:id",
  validate({ params: planIdParams }),
  asyncHandler(ctrl.remove)
);

export default router;
