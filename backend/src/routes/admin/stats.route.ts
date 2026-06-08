import { Router } from "express";
import * as ctrl from "../../controllers/admin/stats.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import { timeseriesQuery } from "../../validators/admin.schema";

const router = Router();

router.get("/overview", asyncHandler(ctrl.overview));
router.get(
  "/timeseries",
  validate({ query: timeseriesQuery }),
  asyncHandler(ctrl.timeseries)
);

export default router;
