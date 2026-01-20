import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { approveOutboundRequestController } from "../controllers/outbound-approval.controller";

const router = Router();

/**
 * PATCH /api/outbound-requests/:id/approval
 * Authorization: Manager only
 */
router.patch(
  "/:id/approval",
  authenticate,
  authorizeRoles("manager"),
  approveOutboundRequestController
);

export default router;
