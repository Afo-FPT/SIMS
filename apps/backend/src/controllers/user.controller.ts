import { Request, Response } from "express";
import User from "../models/User";
import {
  getAllUsers,
  getUserById,
  activateUser,
  deactivateUser,
  updateUser,
  deleteUser,
  updateMyProfile,
  getActiveStaffUsers
} from "../services/user.service";

/**
 * Lấy thông tin user hiện tại
 */
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy danh sách tất cả users (chỉ manager và staff) - Admin only
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({
      data: users
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy thông tin user theo ID - Admin only
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id);
    res.json({
      data: user
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Kích hoạt tài khoản user - Admin only
 */
export const activateUserAccount = async (req: Request, res: Response) => {
  try {
    const user = await activateUser(req.params.id);
    res.json({
      message: "User activated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Vô hiệu hóa tài khoản user - Admin only
 */
export const deactivateUserAccount = async (req: Request, res: Response) => {
  try {
    const user = await deactivateUser(req.params.id);
    res.json({
      message: "User deactivated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Cập nhật thông tin user - Admin only
 */
export const updateUserAccount = async (req: Request, res: Response) => {
  try {
    const { name, role } = req.body;
    const user = await updateUser(req.params.id, { name, role });
    res.json({
      message: "User updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Xóa tài khoản user - Admin only
 */
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const result = await deleteUser(req.params.id);
    res.json({
      message: result.message
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Lấy danh sách staff (role=staff, isActive=true) cho manager/admin
 */
export const getStaffUsersForManager = async (req: Request, res: Response) => {
  try {
    const staff = await getActiveStaffUsers();
    res.json({
      data: staff.map((u) => ({
        user_id: u._id.toString(),
        name: u.name,
        email: u.email
      }))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update current user's profile (any authenticated role)
 * PATCH /api/users/me
 */
export const updateMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, phone, companyName, avatarUrl } = req.body || {};
    const user = await updateMyProfile(req.user.userId, { name, phone, companyName, avatarUrl });
    res.json({ data: user });
  } catch (error: any) {
    const msg = error?.message || "Failed to update profile";
    if (
      msg.includes("Invalid user id") ||
      msg.includes("User not found") ||
      msg.includes("at least") ||
      msg.includes("too large")
    ) {
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: msg });
  }
};
