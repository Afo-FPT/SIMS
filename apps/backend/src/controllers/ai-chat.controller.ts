import { Request, Response } from "express";
import { runAiChat, type ChatMessage } from "../services/ai-chat.service";

const MAX_MESSAGES = 24;
const MAX_CONTENT = 8000;

export async function aiChatController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const body = req.body as { messages?: ChatMessage[] };
    const messages = body.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages[] is required" });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({
        message: `Too many messages (max ${MAX_MESSAGES})`,
      });
    }

    for (const m of messages) {
      if (m.role !== "user" && m.role !== "model") {
        return res.status(400).json({ message: "Invalid message role" });
      }
      if (typeof m.content !== "string" || m.content.length > MAX_CONTENT) {
        return res.status(400).json({ message: "Message content too long" });
      }
    }

    const last = messages[messages.length - 1];
    if (last.role !== "user") {
      return res.status(400).json({ message: "Last message must be from user" });
    }

    const result = await runAiChat(messages, {
      userId: req.user.userId,
      role: req.user.role,
    });

    res.json({
      message: "ok",
      data: {
        reply: result.reply,
        model: result.model,
        table: result.table,
      },
    });
  } catch (error: any) {
    const msg = error?.message || "Chat failed";
    if (msg.includes("GEMINI_API_KEY") || msg.includes("not configured")) {
      return res.status(503).json({ message: msg });
    }
    if (msg.includes("Last message") || msg.includes("Invalid")) {
      return res.status(400).json({ message: msg });
    }
    console.error("[ai-chat]", error);
    res.status(500).json({ message: msg });
  }
}
