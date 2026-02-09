import User from "../models/User";
import { Types } from "mongoose";

/**
 * Lấy danh sách tất cả users (manager, staff và customer)
 */
export async function getAllUsers() {
  return User.find({ role: { $in: ["manager", "staff", "customer"] } })
    .select("-password")
    .sort({ createdAt: -1 });
}

/**
 * Lấy danh sách staff đang active (dùng cho manager assign)
 */
export async function getActiveStaffUsers() {
  return User.find({ role: "staff", isActive: true })
    .select("_id name email role isActive")
    .sort({ name: 1 });
}

/**
 * Lấy thông tin user theo ID
 */
export async function getUserById(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const user = await User.findById(userId).select("-password");
  
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Kích hoạt tài khoản user
 */
export async function activateUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Không cho phép kích hoạt admin account
  if (user.role === "admin") {
    throw new Error("Cannot activate admin account");
  }

  user.isActive = true;
  await user.save();

  return user;
}

/**
 * Vô hiệu hóa tài khoản user
 */
export async function deactivateUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Không cho phép vô hiệu hóa admin account
  if (user.role === "admin") {
    throw new Error("Cannot deactivate admin account");
  }

  user.isActive = false;
  await user.save();

  return user;
}

/**
 * Cập nhật thông tin user (role, name)
 */
export async function updateUser(
  userId: string,
  data: { name?: string; role?: "manager" | "staff" | "customer" }
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Không cho phép cập nhật admin account
  if (user.role === "admin") {
    throw new Error("Cannot update admin account");
  }

  // Chỉ cho phép cập nhật role manager, staff hoặc customer
  if (data.role && data.role !== "manager" && data.role !== "staff" && data.role !== "customer") {
    throw new Error("Invalid role. Only manager, staff or customer roles are allowed");
  }

  if (data.name) {
    user.name = data.name;
  }

  if (data.role) {
    user.role = data.role;
  }

  await user.save();

  return user;
}

/**
 * Xóa tài khoản user
 */
export async function deleteUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Không cho phép xóa admin account
  if (user.role === "admin") {
    throw new Error("Cannot delete admin account");
  }

  await User.findByIdAndDelete(userId);
  
  return { message: "User deleted successfully" };
}