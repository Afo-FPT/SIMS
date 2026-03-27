import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { getSpaceLimitsController, updateSpaceLimitsController } from "../controllers/system-setting.controller";

const router = Router();

router.get("/space-limits", authenticate, authorizeRoles("manager", "admin"), getSpaceLimitsController);
router.patch("/space-limits", authenticate, authorizeRoles("admin"), updateSpaceLimitsController);

export default router;
