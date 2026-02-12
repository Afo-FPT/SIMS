import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { getManagerReportController } from "../controllers/reports.controller";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("manager", "admin"),
  getManagerReportController
);

export default router;
