import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { createWarehouseIssueReportController } from "../controllers/warehouse-issue-report.controller";

const router = Router();

router.use(authenticate);

/**
 * POST /warehouse-issue-reports
 * Staff submit a warehouse issue report (note is required)
 * Role: STAFF
 */
router.post(
  "/",
  authorizeRoles("staff"),
  createWarehouseIssueReportController
);

export default router;
