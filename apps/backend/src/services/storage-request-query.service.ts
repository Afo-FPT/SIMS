import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";

export interface ListStorageRequestsQuery {
  requestType?: "IN" | "OUT";
  status?: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
}

export interface StorageRequestViewDTO {
  request_id: string;
  contract_id: string;
  /** Contract code (e.g. from Contract.contractCode) for display */
  contract_code?: string;
  /** Customer-provided reference (inbound/outbound reference) */
  reference?: string;
  customer_id: string;
  request_type: "IN" | "OUT";
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
  items: Array<{
    request_detail_id: string;
    shelf_id?: string;
    shelf_code?: string;
    zone_id?: string;
    zone_code?: string;
    item_name: string;
    unit: string;
    quantity_per_unit?: number;
    quantity_requested: number;
    quantity_actual?: number;
    damage_quantity?: number;
    loss_reason?: string;
    loss_notes?: string;
  }>;
}

function validateListQuery(q: ListStorageRequestsQuery) {
  if (q.requestType && q.requestType !== "IN" && q.requestType !== "OUT") {
    throw new Error("requestType must be IN or OUT");
  }
}

export async function listStorageRequests(
  userId: string,
  userRole: string,
  query: ListStorageRequestsQuery
): Promise<StorageRequestViewDTO[]> {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user id");
  validateListQuery(query);

  const q: any = {};
  if (userRole === "customer") {
    q.customerId = new Types.ObjectId(userId);
  }
  if (userRole === "staff") {
    q.assignedStaffIds = new Types.ObjectId(userId);
    if (!query.status) q.status = "APPROVED";
  }
  if (query.requestType) q.requestType = query.requestType;
  if (query.status) q.status = query.status;

  const requests = await StorageRequest.find(q).sort({ createdAt: -1 }).lean();
  if (requests.length === 0) return [];

  const contractIds = [...new Set(requests.map((r: any) => r.contractId.toString()))];
  const Contract = (await import("../models/Contract")).default;
  const contracts = await Contract.find({ _id: { $in: contractIds.map((id) => new Types.ObjectId(id)) } })
    .select("_id contractCode")
    .lean();
  const contractCodeById = new Map(contracts.map((c: any) => [c._id.toString(), c.contractCode]));

  const requestIds = requests.map((r: any) => r._id);
  const details = await StorageRequestDetail.find({ requestId: { $in: requestIds } })
    .populate("shelfId", "shelfCode zoneId")
    .lean();

  const detailsByRequest = new Map<string, any[]>();
  for (const d of details) {
    const rid = (d as any).requestId.toString();
    detailsByRequest.set(rid, [...(detailsByRequest.get(rid) || []), d]);
  }

  // Populate zoneCode for shelf zone (optional)
  // We avoid extra lookups when shelfId is missing.
  const Zone = (await import("../models/Zone")).default;
  const zoneIds = Array.from(
    new Set(
      details
        .map((d: any) => d.shelfId?.zoneId?.toString?.())
        .filter(Boolean)
    )
  );
  const zones = zoneIds.length
    ? await Zone.find({ _id: { $in: zoneIds.map((z) => new Types.ObjectId(z)) } })
        .select("_id zoneCode")
        .lean()
    : [];
  const zoneCodeById = new Map(zones.map((z: any) => [z._id.toString(), z.zoneCode]));

  return requests.map((r: any) => {
    const ds = detailsByRequest.get(r._id.toString()) || [];
    return {
      request_id: r._id.toString(),
      contract_id: r.contractId.toString(),
      contract_code: contractCodeById.get(r.contractId.toString()),
      reference: r.reference,
      customer_id: r.customerId.toString(),
      request_type: r.requestType,
      status: r.status,
      approved_by: r.approvedBy?.toString?.(),
      approved_at: r.approvedAt,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      items: ds.map((d: any) => {
        const shelf = d.shelfId;
        const zoneId = shelf?.zoneId?.toString?.();
        return {
          request_detail_id: d._id.toString(),
          shelf_id: shelf?._id?.toString?.(),
          shelf_code: shelf?.shelfCode,
          zone_id: zoneId,
          zone_code: zoneId ? zoneCodeById.get(zoneId) : undefined,
          item_name: d.itemName,
          unit: d.unit || "pcs",
          quantity_per_unit: d.quantityPerUnit,
          quantity_requested: d.quantityRequested,
          quantity_actual: d.quantityActual,
          damage_quantity: d.damageQuantity,
          loss_reason: d.lossReason,
          loss_notes: d.lossNotes
        };
      })
    } satisfies StorageRequestViewDTO;
  });
}

export async function getStorageRequestById(
  requestId: string,
  userId: string,
  userRole: string
): Promise<StorageRequestViewDTO> {
  if (!Types.ObjectId.isValid(requestId)) throw new Error("Invalid request id");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user id");

  const req = await StorageRequest.findById(requestId).lean();
  if (!req) throw new Error("Storage request not found");

  if (userRole === "customer" && (req as any).customerId.toString() !== userId) {
    throw new Error("Access denied. You can only view your own requests.");
  }
  if (userRole === "staff") {
    const assigned = (req as any).assignedStaffIds || [];
    const assignedIds = assigned.map((id: any) => id.toString());
    if (assignedIds.length > 0 && !assignedIds.includes(userId)) {
      throw new Error("Access denied. This request is not assigned to you.");
    }
  }

  const Contract = (await import("../models/Contract")).default;
  const contract = await Contract.findById((req as any).contractId).select("contractCode").lean();
  const contract_code = contract ? (contract as any).contractCode : undefined;

  const details = await StorageRequestDetail.find({ requestId: req._id })
    .populate("shelfId", "shelfCode zoneId")
    .lean();

  const Zone = (await import("../models/Zone")).default;
  const zoneIds = Array.from(
    new Set(details.map((d: any) => d.shelfId?.zoneId?.toString?.()).filter(Boolean))
  );
  const zones = zoneIds.length
    ? await Zone.find({ _id: { $in: zoneIds.map((z) => new Types.ObjectId(z)) } })
        .select("_id zoneCode")
        .lean()
    : [];
  const zoneCodeById = new Map(zones.map((z: any) => [z._id.toString(), z.zoneCode]));

  return {
    request_id: req._id.toString(),
    contract_id: (req as any).contractId.toString(),
    contract_code,
    reference: (req as any).reference,
    customer_id: (req as any).customerId.toString(),
    request_type: (req as any).requestType,
    status: (req as any).status,
    approved_by: (req as any).approvedBy?.toString?.(),
    approved_at: (req as any).approvedAt,
    created_at: (req as any).createdAt,
    updated_at: (req as any).updatedAt,
    items: details.map((d: any) => {
      const shelf = d.shelfId;
      const zoneId = shelf?.zoneId?.toString?.();
      return {
        request_detail_id: d._id.toString(),
        shelf_id: shelf?._id?.toString?.(),
        shelf_code: shelf?.shelfCode,
        zone_id: zoneId,
        zone_code: zoneId ? zoneCodeById.get(zoneId) : undefined,
        item_name: d.itemName,
        unit: d.unit || "pcs",
        quantity_per_unit: d.quantityPerUnit,
        quantity_requested: d.quantityRequested,
        quantity_actual: d.quantityActual,
        damage_quantity: d.damageQuantity,
        loss_reason: d.lossReason,
        loss_notes: d.lossNotes
      };
    })
  };
}

