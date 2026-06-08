import { Router } from "express";
import * as ctrl from "../../controllers/admin/bots.controller";
import { asyncHandler } from "../../middlewares/async-handler";
import { validate } from "../../middlewares/validate.middleware";
import { botCreateBody, botUpdateBody, botIdParams } from "../../validators/admin.schema";

const router = Router();

router.get("/", asyncHandler(ctrl.list));
router.post("/", validate({ body: botCreateBody }), asyncHandler(ctrl.create));
router.patch(
  "/:id",
  validate({ params: botIdParams, body: botUpdateBody }),
  asyncHandler(ctrl.update)
);
router.delete("/:id", validate({ params: botIdParams }), asyncHandler(ctrl.remove));

export default router;
