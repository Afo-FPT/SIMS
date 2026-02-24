import { Router } from "express";
import {
  createContractPackageController,
  listContractPackagesController,
  updateContractPackageController
} from "../controllers/contract-package.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/contract-packages
 * List all contract packages
 * Authorization: Manager only (for now)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("manager"),
  listContractPackagesController
);

/**
 * POST /api/contract-packages
 * Create a new contract package
 * Authorization: Manager only
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("manager"),
  createContractPackageController
);

/**
 * PATCH /api/contract-packages/:id
 * Update an existing contract package
 * Authorization: Manager only
 */
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("manager"),
  updateContractPackageController
);

export default router;

