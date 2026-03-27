import { Router } from "express";
import { createZoneController, listZonesByWarehouseController, updateZoneController } from "../controllers/zone.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true });

/**
 * GET /api/warehouses/:warehouseId/zones
 * List zones in a warehouse (Manager, Staff, Admin, Customer for dropdown)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("manager", "staff", "admin", "customer"),
  listZonesByWarehouseController
);

/**
 * POST /api/warehouses/:warehouseId/zones
 * Create a zone (Manager only)
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("manager"),
  createZoneController
);

router.patch(
  "/:zoneId",
  authenticate,
  authorizeRoles("manager"),
  updateZoneController
);

export default router;
