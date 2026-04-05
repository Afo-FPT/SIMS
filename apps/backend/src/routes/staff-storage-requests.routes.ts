import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { staffCompleteStorageRequestController } from "../controllers/staff-storage-request.controller";

const router = Router();

/**
 * PATCH /api/staff/storage-requests/:id/complete
 * Authorization: Staff only
 */
router.patch(
  "/storage-requests/:id/complete",
  authenticate,
  authorizeRoles("staff"),
  staffCompleteStorageRequestController
);

export default router;

