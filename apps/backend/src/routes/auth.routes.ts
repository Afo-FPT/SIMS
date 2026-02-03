import express from "express";
import { register, login, logout, forgotPassword, resetPasswordHandler, changePasswordHandler } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordHandler);
router.post("/change-password", authenticate, changePasswordHandler);

export default router;
