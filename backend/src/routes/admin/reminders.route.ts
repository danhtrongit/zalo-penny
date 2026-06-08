import { Router } from "express";
import * as ctrl from "../../controllers/admin/reminders.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import {
  reminderListQuery,
  reminderStatsQuery,
} from "../../validators/admin.schema";

const router = Router();

router.get("/", validate({ query: reminderListQuery }), asyncHandler(ctrl.list));
router.get(
  "/stats",
  validate({ query: reminderStatsQuery }),
  asyncHandler(ctrl.stats)
);

export default router;
