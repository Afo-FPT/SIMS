import { Router } from "express";
import {
  createRentRequestController,
  getRentRequestsController,
  submitRentRequestController,
  cancelRentRequestController,
  updateRentRequestStatusController,
} from "../controllers/rent-request.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/rent-requests
 * Create a new rent request
 * Authorization: Customer only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("customer"),
  createRentRequestController
);

/**
 * GET /api/rent-requests
 * Get rent requests
 * Authorization: Customer (own), Manager (all)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("customer", "manager"),
  getRentRequestsController
);

/**
 * PATCH /api/rent-requests/:id/submit
 * Submit a draft rent request
 * Authorization: Customer only
 */
router.patch(
  "/:id/submit",
  authenticate,
  authorizeRoles("customer"),
  submitRentRequestController
);

/**
 * DELETE /api/rent-requests/:id
 * Cancel a draft/submitted rent request
 * Authorization: Customer only
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("customer"),
  cancelRentRequestController
);

/**
 * PATCH /api/rent-requests/:id/status
 * Update rent request status (Approved / Rejected)
 * Authorization: Manager only
 */
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("manager"),
  updateRentRequestStatusController
);

export default router;

