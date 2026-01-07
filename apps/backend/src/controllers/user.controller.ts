import { Request, Response } from "express";
import User from "../models/User";

export const getMe = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.user.userId).select("-password");

  res.json(user);
};
