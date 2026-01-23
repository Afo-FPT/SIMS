import { Request, Response } from "express";
import { registerUser, loginUser, requestPasswordReset, resetPassword } from "../services/auth.service";

async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;

    // Role là optional, nếu không có thì mặc định là customer
    // Nếu có role, phải là manager, staff hoặc customer
    if (role && role !== "manager" && role !== "staff" && role !== "customer") {
      return res.status(400).json({ 
        message: "Invalid role. Role must be 'manager', 'staff' or 'customer'" 
      });
    }

    const user = await registerUser(name, email, password, role);

    res.status(201).json({
      message: "User registered successfully. Please wait for admin activation",
      user: {
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
}

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const data = await loginUser(email, password);

    res.json({
      message: "Login successful",
      token: data.token,
      user: data.user
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
}

async function logout(req: Request, res: Response) {
  try {
    // Với JWT stateless, logout chủ yếu là xóa token ở client-side
    // Nếu cần hủy token ngay lập tức, có thể implement token blacklist
    res.json({
      message: "Logout successful"
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await requestPasswordReset(email);

    // Luôn trả về message thành công để không tiết lộ email có tồn tại hay không
    const response: any = {
      message: result.message || "If email exists, reset link will be sent"
    };

    // Trong development mode, có thể trả về resetLink để test
    if (process.env.NODE_ENV !== "production" && result.resetLink) {
      response.resetLink = result.resetLink;
    }

    res.json(response);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        message: "Token and password are required" 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters" 
      });
    }

    await resetPassword(token, password);

    res.json({
      message: "Password reset successfully. You can now login with your new password"
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
}

export { register, login, logout, forgotPassword, resetPasswordHandler };
