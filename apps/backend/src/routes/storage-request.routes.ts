import { Router } from "express";
import {
  createInboundRequestController,
  createOutboundRequestController
} from "../controllers/storage-request.controller";
import { customerConfirmStorageRequestController } from "../controllers/storage-request-confirm.controller";
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

/**
 * PATCH /api/storage-requests/:id/confirm
 * Customer confirms staff completion
 * Authorization: Customer only
 */
router.patch(
  "/:id/confirm",
  authenticate,
  authorizeRoles("customer"),
  customerConfirmStorageRequestController
);

export default router;
