import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import { signToken } from "../utils/jwt";
import { sendPasswordResetEmail } from "../utils/email";

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role?: "manager" | "staff" | "customer"
) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  // Nếu không chỉ định role, mặc định là customer
  const userRole = role || "customer";

  // Validate role - chỉ cho phép manager, staff hoặc customer
  if (userRole !== "manager" && userRole !== "staff" && userRole !== "customer") {
    throw new Error("Invalid role. Only manager, staff or customer roles are allowed");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: userRole,
    isActive: true // Tài khoản mới chưa được kích hoạt
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Kiểm tra tài khoản đã được kích hoạt chưa
  if (!user.isActive) {
    throw new Error("Account is not activated. Please contact admin");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = signToken({
    userId: user._id.toString(),
    role: user.role
  });

  return { user, token };
}

/**
 * Yêu cầu reset password - tạo reset token
 */
export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email });
  
  // Không tiết lộ nếu email không tồn tại (bảo mật)
  if (!user) {
    return { message: "If email exists, reset link will be sent" };
  }

  // Kiểm tra tài khoản đã được kích hoạt chưa
  if (!user.isActive) {
    throw new Error("Account is not activated. Please contact admin");
  }

  // Tạo reset token ngẫu nhiên
  const resetToken = crypto.randomBytes(32).toString("hex");
  
  // Hash token trước khi lưu vào database
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Lưu token và thời gian hết hạn (1 giờ)
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ
  await user.save();

  // Gửi email reset password
  try {
    await sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (error) {
    // Nếu gửi email thất bại, vẫn trả về success để không tiết lộ email có tồn tại
    // Nhưng log lỗi để admin biết
    console.error("Failed to send password reset email:", error);
    // Trong development mode, có thể trả về resetLink để test
    if (process.env.NODE_ENV === "development") {
      return {
        message: "Password reset token generated (email failed, see console)",
        resetLink: `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`
      };
    }
  }

  // Trong production, không trả về token/link
  return {
    message: "If email exists, reset link will be sent"
  };
}

/**
 * Reset password với token
 */
export async function resetPassword(token: string, newPassword: string) {
  // Hash token để so sánh với token trong database
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Tìm user với token hợp lệ và chưa hết hạn
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  // Kiểm tra tài khoản đã được kích hoạt chưa
  if (!user.isActive) {
    throw new Error("Account is not activated. Please contact admin");
  }

  // Hash password mới
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Cập nhật password và xóa reset token
  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { message: "Password reset successfully" };
}

/**
 * Change password for authenticated user (current password + new password)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.isActive) {
    throw new Error("Account is not activated");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return { message: "Password changed successfully" };
}
