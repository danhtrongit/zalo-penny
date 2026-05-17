import { Router } from "express";
import { getReport } from "../controllers/report.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { getReportQuery } from "../validators/report.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", validate({ query: getReportQuery }), asyncHandler(getReport));

export default router;
