import { Router } from "express";
import * as ctrl from "../../controllers/admin/users.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import {
  changeRoleBody,
  listUsersQuery,
  lockUserBody,
  userIdParams,
} from "../../validators/admin.schema";

const router = Router();

router.get("/", validate({ query: listUsersQuery }), asyncHandler(ctrl.list));
router.get("/:id", validate({ params: userIdParams }), asyncHandler(ctrl.detail));
router.post(
  "/:id/lock",
  validate({ params: userIdParams, body: lockUserBody }),
  asyncHandler(ctrl.lock)
);
router.post(
  "/:id/unlock",
  validate({ params: userIdParams }),
  asyncHandler(ctrl.unlock)
);
router.patch(
  "/:id/role",
  validate({ params: userIdParams, body: changeRoleBody }),
  asyncHandler(ctrl.changeRole)
);

export default router;
