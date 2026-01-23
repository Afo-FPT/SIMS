import { Router } from "express";
import {
  createInboundRequestController,
  createOutboundRequestController
} from "../controllers/storage-request.controller";
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

/**
 * POST /api/storage-requests/outbound
 * Create a new outbound request
 * Authorization: Customer only
 */
router.post(
  "/outbound",
  authenticate,
  authorizeRoles("customer"),
  createOutboundRequestController
);

export default router;
