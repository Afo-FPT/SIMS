import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { aiChatController } from "../controllers/ai-chat.controller";
import { aiInsightsController } from "../controllers/ai-insights.controller";
import { getFaqsController, updateFaqsController } from "../controllers/ai-faq.controller";
import { getAiSettingsController, updateAiSettingsController } from "../controllers/ai-settings.controller";

const router = Router();

/**
 * POST /api/ai/chat
 * Body: { messages: { role: "user"|"model", content: string }[] }
 */
router.post("/chat", authenticate, aiChatController);
router.post("/insights", authenticate, aiInsightsController);
router.get("/faqs", authenticate, getFaqsController);
router.put("/faqs", authenticate, authorizeRoles("admin"), updateFaqsController);
router.get("/settings", authenticate, authorizeRoles("admin"), getAiSettingsController);
router.put("/settings", authenticate, authorizeRoles("admin"), updateAiSettingsController);

export default router;
