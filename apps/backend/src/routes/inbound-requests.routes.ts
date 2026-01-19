import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { approveInboundRequestController } from "../controllers/inbound-approval.controller";

const router = Router();

/**
 * PATCH /api/inbound-requests/:id/approval
 * Authorization: Manager only
 */
router.patch(
  "/:id/approval",
  authenticate,
  authorizeRoles("manager"),
  approveInboundRequestController
);

export default router;

