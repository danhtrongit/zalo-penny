import { Router } from "express";
import { getPersona, updatePersona } from "../controllers/persona.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { updatePersonaBody } from "../validators/persona.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(getPersona));
router.put("/", validate({ body: updatePersonaBody }), asyncHandler(updatePersona));

export default router;
