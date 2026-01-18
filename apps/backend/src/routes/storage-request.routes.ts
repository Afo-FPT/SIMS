import { Router } from "express";
import { createInboundRequestController } from "../controllers/storage-request.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/storage-requests/inbound
 * Create a new inbound request
 * Authorization: Customer only
 */
router.post(
  "/inbound",
  authenticate,
  authorizeRoles("customer"),
  createInboundRequestController
);

export default router;
