import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { aiChatController } from "../controllers/ai-chat.controller";

const router = Router();

/**
 * POST /api/ai/chat
 * Body: { messages: { role: "user"|"model", content: string }[] }
 */
router.post("/chat", authenticate, aiChatController);

export default router;
