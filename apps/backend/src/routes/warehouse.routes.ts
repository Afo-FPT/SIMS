import { Router } from "express";
import {
  createWarehouseController,
  searchAndFilterWarehousesController,
  updateWarehouseStatusController
} from "../controllers/warehouse.controller";
import { createShelvesController } from "../controllers/shelf.controller";
import zoneRoutes from "./zone.routes";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/warehouses
 * Search and filter warehouses (customer: list for rent request; manager/staff/admin: manage)
 * Authorization: Customer, Manager, Staff, Admin
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
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
 * /api/warehouses/:warehouseId/zones - list/create zones in warehouse
 */
router.use("/:warehouseId/zones", zoneRoutes);

/**
 * POST /api/warehouses/:warehouseId/shelves
 * Create shelves in a zone (batch creation)
 * Authorization: Manager only
 */
router.post(
  "/:warehouseId/shelves",
  authenticate,
  authorizeRoles("manager"),
  createShelvesController
);

export default router;
