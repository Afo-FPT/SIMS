import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  getUnreadCountController,
  listMyNotificationsController,
  markAllReadController,
  markNotificationReadController
} from "../controllers/notification.controller";

const router = Router();

router.get(
  "/my",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  listMyNotificationsController
);

router.get(
  "/my/unread-count",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  getUnreadCountController
);

router.patch(
  "/my/read-all",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  markAllReadController
);

router.patch(
  "/:id/read",
  authenticate,
  authorizeRoles("customer", "manager", "staff", "admin"),
  markNotificationReadController
);

export default router;

