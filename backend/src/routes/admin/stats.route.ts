import { Router } from "express";
import * as ctrl from "../../controllers/admin/stats.controller";
import { asyncHandler } from "../../middlewares/async-handler";

const router = Router();

router.get("/overview", asyncHandler(ctrl.overview));

export default router;
