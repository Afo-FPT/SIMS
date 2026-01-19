import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import InboundApproval from "../models/InboundApproval";
import User from "../models/User";

export interface InboundApprovalRequestDTO {
  decision: "APPROVED" | "REJECTED";
  note?: string;
}

export interface InboundApprovalResponseDTO {
  inbound_request_id: string;
  final_status: "APPROVED" | "REJECTED";
  approval: {
    decision: "APPROVED" | "REJECTED";
    note?: string;
    approved_at: Date;
  };
  manager: {
    user_id: string;
    name?: string;
    email?: string;
  };
  updated_at: Date;
}

function validateApprovalRequest(dto: InboundApprovalRequestDTO) {
  if (!dto.decision || (dto.decision !== "APPROVED" && dto.decision !== "REJECTED")) {
    throw new Error("decision must be APPROVED or REJECTED");
  }

  if (dto.decision === "REJECTED") {
    if (!dto.note || dto.note.trim().length === 0) {
      throw new Error("note is required when decision is REJECTED");
    }
  }
}

/**
 * Manager approves/rejects an inbound request.
 *
 * Rules:
 * - Only PENDING inbound requests can be approved/rejected
 * - A request cannot be approved/rejected more than once
 * - Uses transaction to update request + create approval record atomically
 */
export async function approveOrRejectInboundRequest(
  inboundRequestId: string,
  managerId: string,
  dto: InboundApprovalRequestDTO
): Promise<InboundApprovalResponseDTO> {
  if (!Types.ObjectId.isValid(inboundRequestId)) {
    throw new Error("Invalid inbound request id");
  }
  if (!Types.ObjectId.isValid(managerId)) {
    throw new Error("Invalid manager id");
  }

  validateApprovalRequest(dto);

  // Validate manager exists (optional but gives better error)
  const manager = await User.findById(managerId).select("name email role");
  if (!manager) {
    throw new Error("Manager not found");
  }
  if (manager.role !== "manager") {
    throw new Error("Only managers can approve/reject inbound requests");
  }

  const session = await StorageRequest.startSession();
  session.startTransaction();

  try {
    const request = await StorageRequest.findById(inboundRequestId).session(session);
    if (!request) {
      throw new Error("Inbound request not found");
    }

    if (request.requestType !== "IN") {
      throw new Error("Request is not an inbound request");
    }

    if (request.status !== "PENDING") {
      throw new Error("Only PENDING requests can be approved/rejected");
    }

    // Prevent double decision by checking approval record (unique per request)
    const existingApproval = await InboundApproval.findOne({
      inboundRequestId: request._id
    }).session(session);
    if (existingApproval) {
      throw new Error("This inbound request has already been approved/rejected");
    }

    const now = new Date();
    const finalStatus = dto.decision === "APPROVED" ? "APPROVED" : "REJECTED";

    request.status = finalStatus;
    request.approvedBy = new Types.ObjectId(managerId);
    request.approvedAt = now;
    await request.save({ session });

    await InboundApproval.create(
      [
        {
          inboundRequestId: request._id,
          managerId: new Types.ObjectId(managerId),
          decision: dto.decision,
          note: dto.note?.trim(),
          approvedAt: now
        }
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      inbound_request_id: request._id.toString(),
      final_status: finalStatus,
      approval: {
        decision: dto.decision,
        note: dto.note?.trim(),
        approved_at: now
      },
      manager: {
        user_id: manager._id.toString(),
        name: manager.name,
        email: manager.email
      },
      updated_at: request.updatedAt
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

