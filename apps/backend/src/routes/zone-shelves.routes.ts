import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { listAvailableShelvesByZoneController } from "../controllers/zoneShelves.controller";

const router = Router();

/**
 * GET /api/zones/:zoneId/shelves
 * List AVAILABLE shelves in a specific zone
 * Authorization: Customer, Manager, Staff, Admin
 */
router.get(
  "/:zoneId/shelves",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  listAvailableShelvesByZoneController
);

export default router;

