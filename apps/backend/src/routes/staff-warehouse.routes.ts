import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { listStaffWithWarehouseController, transferStaffWarehouseController } from "../controllers/staff-warehouse.controller";

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
 * PATCH /api/staff-warehouses/staffs/:staffId/warehouse
 * Authorization: Manager only
 * Body: { warehouseId: string }
 */
router.patch(
  "/staffs/:staffId/warehouse",
  authenticate,
  authorizeRoles("manager"),
  transferStaffWarehouseController
);

export default router;

