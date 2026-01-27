import { Router } from "express";
import {
  createWarehouseController,
  searchAndFilterWarehousesController,
  updateWarehouseStatusController
} from "../controllers/warehouse.controller";
import { createShelvesController } from "../controllers/shelf.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/warehouses
 * Search and filter warehouses
 * Authorization: Manager, Staff, Admin
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("manager", "staff", "admin"),
  searchAndFilterWarehousesController
);

/**
 * POST /api/warehouses
 * Create a new warehouse
 * Authorization: Manager only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("manager"),
  createWarehouseController
);

/**
 * PATCH /api/warehouses/:id/status
 * Update warehouse status
 * Authorization: Manager only
 */
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("manager"),
  updateWarehouseStatusController
);

/**
 * POST /api/warehouses/:warehouseId/shelves
 * Create shelves for a warehouse (batch creation)
 * Authorization: Manager only
 */
router.post(
  "/:warehouseId/shelves",
  authenticate,
  authorizeRoles("manager"),
  createShelvesController
);

export default router;
