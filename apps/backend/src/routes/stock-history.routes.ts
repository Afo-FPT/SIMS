import { Router } from "express";
import {
  getStockInHistoryController,
  getStockOutHistoryController
} from "../controllers/stock-history.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/stock-history/inbound
 * Get stock-in history (inbound requests)
 * Authorization: Manager, Staff, Admin, Customer (only their own)
 */
router.get(
  "/inbound",
  authenticate,
  authorizeRoles("manager", "staff", "admin", "customer"),
  getStockInHistoryController
);

/**
 * GET /api/stock-history/outbound
 * Get stock-out history (outbound requests)
 * Authorization: Manager, Staff, Admin, Customer (only their own)
 */
router.get(
  "/outbound",
  authenticate,
  authorizeRoles("manager", "staff", "admin", "customer"),
  getStockOutHistoryController
);

export default router;
