import { Router } from "express";
import { createWarehouseController } from "../controllers/warehouse.controller";
import { createShelvesController } from "../controllers/shelf.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

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
