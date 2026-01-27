import { Router } from "express";
import {
  getRackUtilizationController,
  updateRackStatusController
} from "../controllers/shelf.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/shelves/:id/utilization
 * Get rack utilization by shelf ID
 * Authorization: Manager, Staff, Admin
 */
router.get(
  "/:id/utilization",
  authenticate,
  authorizeRoles("manager", "staff", "admin"),
  getRackUtilizationController
);

/**
 * PATCH /api/shelves/:id/status
 * Update rack (shelf) status
 * Authorization: Manager only
 */
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("manager"),
  updateRackStatusController
);

export default router;
