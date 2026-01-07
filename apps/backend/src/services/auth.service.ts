import bcrypt from "bcryptjs";
import User from "../models/User";
import { signToken } from "../utils/jwt";

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role?: "admin" | "staff" 
) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = signToken({
    userId: user._id,
    role: user.role
  });

  return { user, token };
}
