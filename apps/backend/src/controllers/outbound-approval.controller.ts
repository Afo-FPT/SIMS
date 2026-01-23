import { Request, Response } from "express";
import {
  approveOrRejectOutboundRequest,
  OutboundApprovalRequestDTO
} from "../services/outbound-approval.service";

/**
 * PATCH /api/outbound-requests/:id/approval
 * Manager approves/rejects an outbound request.
 */
export async function approveOutboundRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { decision, note } = req.body;

    const dto: OutboundApprovalRequestDTO = {
      decision,
      note
    };

    const data = await approveOrRejectOutboundRequest(id, req.user.userId, dto);

    return res.json({
      message: "Outbound request approval updated successfully",
      data
    });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";

    // Validation / business rule errors
    if (
      msg.includes("Invalid") ||
      msg.includes("must be") ||
      msg.includes("required") ||
      msg.includes("not found") ||
      msg.includes("Only") ||
      msg.includes("already been") ||
      msg.includes("not an outbound") ||
      msg.includes("PENDING")
    ) {
      return res.status(400).json({ message: msg });
    }

    return res.status(500).json({ message: msg });
  }
}
