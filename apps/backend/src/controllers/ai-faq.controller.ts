import { Request, Response } from "express";
import { getFaqsByRole, updateFaqsByRole } from "../services/ai-faq.service";
import type { ChatFaqRole } from "../models/ChatFaq";

function normalizeRoleFromQuery(role: unknown): ChatFaqRole | null {
  if (role === "customer" || role === "manager" || role === "staff" || role === "admin") return role;
  return null;
}

export async function getFaqsController(req: Request, res: Response) {
  try {
    const { role } = req.query ?? {};
    const user = (req as any).user as { role?: string };
    const userRole = user?.role;

    if (!userRole) return res.status(401).json({ message: "Unauthorized" });

    // Non-admin: always return FAQs for their own role.
    if (userRole !== "admin") {
      const normalized = normalizeRoleFromQuery(userRole);
      if (!normalized) return res.status(400).json({ message: "Invalid role" });
      const items = await getFaqsByRole(normalized);
      return res.json({ data: { role: normalized, items } });
    }

    // Admin: can request a specific role via query param (including admin itself).
    const normalized = normalizeRoleFromQuery(role);
    if (!normalized) {
      return res.status(400).json({ message: "Admin must provide role=customer|manager|staff|admin" });
    }
    const items = await getFaqsByRole(normalized);
    return res.json({ data: { role: normalized, items } });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to load FAQs" });
  }
}

export async function updateFaqsController(req: Request, res: Response) {
  try {
    const { role, items } = req.body ?? {};
    const roleNormalized = normalizeRoleFromQuery(role);
    if (!roleNormalized) return res.status(400).json({ message: "role must be customer|manager|staff|admin" });

    const updatedItems = await updateFaqsByRole({ role: roleNormalized, items });
    return res.json({ message: "ok", data: { role: roleNormalized, items: updatedItems } });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update FAQs" });
  }
}

