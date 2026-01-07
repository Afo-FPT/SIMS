import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";

async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;

    const user = await registerUser(name, email, password, role);

    res.status(201).json({
      message: "User registered successfully",
      user
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

export { register, login };
