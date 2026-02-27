import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  getManagerReportController,
  getTopOutboundProductsController,
  getApprovalByManagerController,
  getProcessingTimeController
} from "../controllers/reports.controller";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("manager", "admin"),
  getManagerReportController
);

router.get(
  "/top-outbound-products",
  authenticate,
  authorizeRoles("manager", "admin"),
  getTopOutboundProductsController
);

router.get(
  "/approval-by-manager",
  authenticate,
  authorizeRoles("manager", "admin"),
  getApprovalByManagerController
);

router.get(
  "/processing-time",
  authenticate,
  authorizeRoles("manager", "admin"),
  getProcessingTimeController
);

export default router;
