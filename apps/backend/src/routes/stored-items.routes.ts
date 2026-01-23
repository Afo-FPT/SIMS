import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { getMyStoredItemsController } from "../controllers/stored-item.controller";

const router = Router();

router.get("/my", authenticate, authorizeRoles("customer"), getMyStoredItemsController);

export default router;

