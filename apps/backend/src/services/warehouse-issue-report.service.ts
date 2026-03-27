import { Types } from "mongoose";
import WarehouseIssueReport from "../models/WarehouseIssueReport";

export interface CreateWarehouseIssueReportDTO {
  note: string;
  warehouseId?: string;
  type?: string;
}

export interface WarehouseIssueReportResponse {
  report_id: string;
  staff_id: string;
  warehouse_id?: string;
  note: string;
  type?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function validateCreateDTO(data: CreateWarehouseIssueReportDTO): void {
  if (!data.note || typeof data.note !== "string") {
    throw new Error("Note is required");
  }
  const trimmed = data.note.trim();
  if (trimmed.length === 0) {
    throw new Error("Note cannot be empty");
  }
  if (data.warehouseId && !Types.ObjectId.isValid(data.warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }
  const allowedTypes = ["damage", "safety", "equipment", "inventory", "other"];
  if (data.type && !allowedTypes.includes(data.type)) {
    throw new Error("Invalid report type");
  }
}

/**
 * STAFF creates a warehouse issue report. Note is mandatory.
 */
export async function createWarehouseIssueReport(
  staffId: string,
  dto: CreateWarehouseIssueReportDTO
): Promise<WarehouseIssueReportResponse> {
  validateCreateDTO(dto);

  if (!Types.ObjectId.isValid(staffId)) {
    throw new Error("Invalid staff ID");
  }

  const doc = await WarehouseIssueReport.create({
    staffId: new Types.ObjectId(staffId),
    warehouseId: dto.warehouseId ? new Types.ObjectId(dto.warehouseId) : undefined,
    note: dto.note.trim(),
    type: dto.type?.trim() || undefined,
    status: "open"
  });

  return {
    report_id: doc._id.toString(),
    staff_id: doc.staffId.toString(),
    warehouse_id: doc.warehouseId?.toString(),
    note: doc.note,
    type: doc.type,
    status: doc.status,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  };
}
