import { Request, Response } from "express";
import { getUnreadCount, listMyNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notification.service";

export async function listMyNotificationsController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const unreadOnly = req.query.unreadOnly === "true";
    const data = await listMyNotifications({ userId: req.user.userId, page, limit, unreadOnly });
    return res.json({ message: "Notifications retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function markNotificationReadController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;
    const data = await markNotificationRead({ userId: req.user.userId, notificationId: id });
    return res.json({ message: "Notification marked as read", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("Invalid") || msg.includes("not found")) return res.status(400).json({ message: msg });
    return res.status(500).json({ message: msg });
  }
}

export async function getUnreadCountController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const data = await getUnreadCount({ userId: req.user.userId });
    return res.json({ message: "Unread count retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function markAllReadController(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const data = await markAllNotificationsRead({ userId: req.user.userId });
    return res.json({ message: "All notifications marked as read", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

