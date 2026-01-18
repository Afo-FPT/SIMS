import bcrypt from "bcryptjs";
import User from "../models/User";
import { signToken } from "../utils/jwt";

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
