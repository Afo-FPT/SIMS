import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  getMe,
  getUsers,
  getUser,
  activateUserAccount,
  deactivateUserAccount,
  updateUserAccount,
  deleteUserAccount
} from "../controllers/user.controller";

const router = express.Router();

// Lấy thông tin user hiện tại (bất kỳ role nào đã đăng nhập)
router.get("/me", authenticate, getMe);

// Quản lý users - Chỉ Admin mới có quyền
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getUsers
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
