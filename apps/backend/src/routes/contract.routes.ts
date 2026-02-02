import { Router } from "express";
import {
  createContractController,
  requestDraftContractController,
  getContractsController,
  getContractByIdController,
  updateContractStatusController
} from "../controllers/contract.controller";
import { listContractShelvesController } from "../controllers/shelf.controller";
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
 * POST /api/contracts/request-draft
 * Customer requests draft contract: warehouse + shelf count + date range;
 * system auto-selects available shelves and creates draft for manager to activate.
 * Authorization: Customer only
 */
router.post(
  "/request-draft",
  authenticate,
  authorizeRoles("customer"),
  requestDraftContractController
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
 * GET /api/contracts/:contractId/shelves
 * Authorization: Customer (own), Manager, Staff
 */
router.get(
  "/:contractId/shelves",
  authenticate,
  authorizeRoles("customer", "manager", "staff"),
  listContractShelvesController
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
