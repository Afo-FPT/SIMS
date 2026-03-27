import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import {
  createCycleCountController,
  getCycleCountsController,
  getCycleCountByIdController,
  approveOrRejectCycleCountController,
  assignStaffToCycleCountController,
  submitCycleCountResultController,
  confirmCycleCountController,
  requestRecountController,
  requestInventoryAdjustmentController,
  applyCycleCountAdjustmentController
} from "../controllers/cycle-count.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /cycle-counts
 * Create cycle count request
 * Role: CUSTOMER
 */
router.post(
  "/",
  authorizeRoles("customer"),
  createCycleCountController
);

/**
 * GET /cycle-counts
 * Get cycle counts (role-based filtering)
 * Roles: CUSTOMER, MANAGER, STAFF, ADMIN
 */
router.get("/", getCycleCountsController);

/**
 * GET /cycle-counts/:id
 * Get cycle count by ID
 * Roles: CUSTOMER, MANAGER, STAFF, ADMIN
 */
router.get("/:id", getCycleCountByIdController);

/**
 * PUT /cycle-counts/:id/approve
 * Approve or reject cycle count
 * Role: MANAGER
 */
router.put(
  "/:id/approve",
  authorizeRoles("manager"),
  approveOrRejectCycleCountController
);

/**
 * PUT /cycle-counts/:id/assign-staff
 * Assign staff to cycle count
 * Role: MANAGER
 */
router.put(
  "/:id/assign-staff",
  authorizeRoles("manager"),
  assignStaffToCycleCountController
);

/**
 * PUT /cycle-counts/:id/submit-result
 * Submit cycle count result
 * Role: STAFF
 */
router.put(
  "/:id/submit-result",
  authorizeRoles("staff"),
  submitCycleCountResultController
);

/**
 * PUT /cycle-counts/:id/confirm
 * CUSTOMER confirm cycle count result (không điều chỉnh tồn kho)
 * Role: CUSTOMER
 */
router.put(
  "/:id/confirm",
  authorizeRoles("customer"),
  confirmCycleCountController
);

/**
 * PUT /cycle-counts/:id/request-recount
 * Request recount
 * Role: MANAGER
 */
router.put(
  "/:id/request-recount",
  authorizeRoles("manager"),
  requestRecountController
);

/**
 * PUT /cycle-counts/:id/request-adjustment
 * CUSTOMER yêu cầu điều chỉnh tồn kho theo kết quả kiểm kê
 * Role: CUSTOMER
 */
router.put(
  "/:id/request-adjustment",
  authorizeRoles("customer"),
  requestInventoryAdjustmentController
);

/**
 * PUT /cycle-counts/:id/apply-adjustment
 * MANAGER áp dụng điều chỉnh tồn kho từ kết quả kiểm kê
 * Role: MANAGER
 */
router.put(
  "/:id/apply-adjustment",
  authorizeRoles("manager"),
  applyCycleCountAdjustmentController
);

export default router;
