import { Router } from "express";
import {
  createInboundRequestController,
  createOutboundRequestController
} from "../controllers/storage-request.controller";
import {
  listStorageRequestsController,
  getStorageRequestByIdController
} from "../controllers/storage-request-query.controller";
import { customerConfirmStorageRequestController } from "../controllers/storage-request-confirm.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/storage-requests
 * List storage requests
 * Authorization: Customer (own), Manager/Staff/Admin (all)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  listStorageRequestsController
);

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
 * GET /api/storage-requests/:id
 * Get request detail
 * Authorization: Customer (own), Manager/Staff/Admin (any)
 */
router.get(
  "/:id",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  getStorageRequestByIdController
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
