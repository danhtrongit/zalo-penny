import { Router } from "express";
import * as ctrl from "../../controllers/admin/payments.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import { listPaymentsQuery } from "../../validators/admin.schema";

const router = Router();

router.get("/", validate({ query: listPaymentsQuery }), asyncHandler(ctrl.list));

export default router;
