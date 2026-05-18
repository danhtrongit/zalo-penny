import { Router } from "express";
import healthRoute from "./health.route";
import authRoute from "./auth.route";
import planRoute from "./plan.route";
import subscriptionRoute from "./subscription.route";
import paymentRoute from "./payment.route";
import botRoute from "./bot.route";
import dashboardRoute from "./dashboard.route";
import transactionRoute from "./transaction.route";
import budgetRoute from "./budget.route";
import personaRoute from "./persona.route";
import reportRoute from "./report.route";
import adminRoute from "./admin";

const router = Router();

router.use("/health", healthRoute);
router.use("/auth", authRoute);
router.use("/plans", planRoute);
router.use("/subscriptions", subscriptionRoute);
router.use("/payments", paymentRoute);
router.use("/bot", botRoute);
router.use("/dashboard", dashboardRoute);
router.use("/transactions", transactionRoute);
router.use("/budgets", budgetRoute);
router.use("/persona", personaRoute);
router.use("/reports", reportRoute);
router.use("/admin", adminRoute);

export default router;
