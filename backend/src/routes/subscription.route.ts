import { Router } from "express";
import {
  createSubscription,
  mySubscription,
} from "../controllers/subscription.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { createSubscriptionBody } from "../validators/subscription.schema";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validate({ body: createSubscriptionBody }),
  asyncHandler(createSubscription)
);
router.get("/mine", asyncHandler(mySubscription));

export default router;
