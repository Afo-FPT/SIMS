import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  assignStaffToWarehouseController,
  listStaffWithWarehouseController,
  listWarehousesWithAssignedStaffController,
  unassignStaffFromWarehouseController,
} from "../controllers/staff-warehouse.controller";

const router = Router();

/**
 * GET /api/staff-warehouses/staffs
 * Authorization: Manager only
 */
router.get(
  "/staffs",
  authenticate,
  authorizeRoles("manager"),
  listStaffWithWarehouseController
);

/**
 * GET /api/staff-warehouses/warehouses
 * Authorization: Manager only
 */
router.get(
  "/warehouses",
  authenticate,
  authorizeRoles("manager"),
  listWarehousesWithAssignedStaffController
);

/**
 * PATCH /api/staff-warehouses/warehouses/:warehouseId/staff
 * Authorization: Manager only
 * Body: { staffId: string }
 */
router.patch(
  "/warehouses/:warehouseId/staff",
  authenticate,
  authorizeRoles("manager"),
  assignStaffToWarehouseController
);

/**
 * DELETE /api/staff-warehouses/warehouses/:warehouseId/staff
 * Authorization: Manager only
 */
router.delete(
  "/warehouses/:warehouseId/staff",
  authenticate,
  authorizeRoles("manager"),
  unassignStaffFromWarehouseController
);

export default router;

