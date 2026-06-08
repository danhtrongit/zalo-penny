import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../../middlewares/auth.middleware";
import usersRoute from "./users.route";
import plansRoute from "./plans.route";
import paymentsRoute from "./payments.route";
import subscriptionsRoute from "./subscriptions.route";
import notificationsRoute from "./notifications.route";
import statsRoute from "./stats.route";
import botsRoute from "./bots.route";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.use("/users", usersRoute);
router.use("/plans", plansRoute);
router.use("/payments", paymentsRoute);
router.use("/subscriptions", subscriptionsRoute);
router.use("/notifications", notificationsRoute);
router.use("/stats", statsRoute);
router.use("/bots", botsRoute);

export default router;
