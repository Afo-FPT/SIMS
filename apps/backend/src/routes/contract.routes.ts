import { Router } from "express";
import {
  createContractController,
  getContractsController,
  getContractByIdController,
  updateContractStatusController
} from "../controllers/contract.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/contracts
 * Create a new contract
 * Authorization: Manager only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("manager"),
  createContractController
);

/**
 * GET /api/contracts
 * Get all contracts (role-based: Manager sees all, Customer sees own)
 * Authorization: Manager or Customer
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("manager", "customer"),
  getContractsController
);

/**
 * GET /api/contracts/:id
 * Get contract by ID
 * Authorization: Manager (any contract), Customer (own contracts only)
 */
router.get(
  "/:id",
  authenticate,
  authorizeRoles("manager", "customer"),
  getContractByIdController
);

/**
 * PATCH /api/contracts/:id/status
 * Update contract status (activate, terminate, expire)
 * Authorization: Manager only
 */
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("manager"),
  updateContractStatusController
);

export default router;
