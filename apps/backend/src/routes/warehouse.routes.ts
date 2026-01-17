import { Router } from "express";
import { createWarehouseController } from "../controllers/warehouse.controller";
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

export default router;
