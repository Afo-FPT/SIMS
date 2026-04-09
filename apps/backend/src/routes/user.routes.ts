import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  getMe,
  updateMe,
  getUsers,
  getUser,
  activateUserAccount,
  deactivateUserAccount,
  updateUserAccount,
  deleteUserAccount,
  getStaffUsersForManager,
  getAdminDashboardSnapshot
} from "../controllers/user.controller";

const router = express.Router();

// Lấy thông tin user hiện tại (bất kỳ role nào đã đăng nhập)
router.get("/me", authenticate, getMe);
// Cập nhật thông tin user hiện tại (bất kỳ role nào đã đăng nhập)
router.patch("/me", authenticate, updateMe);

// Quản lý users - Chỉ Admin mới có quyền
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getUsers
);

// Danh sách staff cho manager/admin (dùng assign cycle count, tasks, ...)
router.get(
  "/staff",
  authenticate,
  authorizeRoles("manager", "admin"),
  getStaffUsersForManager
);

router.get(
  "/dashboard-snapshot",
  authenticate,
  authorizeRoles("admin"),
  getAdminDashboardSnapshot
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  getUser
);

router.put(
  "/:id/activate",
  authenticate,
  authorizeRoles("admin"),
  activateUserAccount
);

router.put(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("admin"),
  deactivateUserAccount
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  updateUserAccount
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteUserAccount
);

export default router;
