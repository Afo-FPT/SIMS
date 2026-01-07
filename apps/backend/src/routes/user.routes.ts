import express from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = express.Router();

router.get(
  "/me",
  authenticate,
  (req, res) => {
    res.json({
      message: "Authenticated user",
      user: req.user
    });
  }
);

router.get(
  "/admin-only",
  authenticate,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({ message: "Welcome Admin " });
  }
);

export default router;
