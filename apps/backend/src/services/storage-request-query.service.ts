import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";

export interface ListStorageRequestsQuery {
  requestType?: "IN" | "OUT";
  status?: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  /** When true, staff sees all assigned requests regardless of status (e.g. reports). */
  allAssigned?: boolean;
}

export interface StorageRequestViewDTO {
  request_id: string;
  contract_id: string;
  /** Contract code (e.g. from Contract.contractCode) for display */
  contract_code?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  requested_zone_id?: string;
  requested_zone_code?: string;
  /** Customer-provided reference (inbound/outbound reference) */
  reference?: string;
  customer_id: string;
  customer_name?: string;
  request_type: "IN" | "OUT";
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  approved_by?: string;
  approved_at?: Date;
  customer_confirmed_at?: Date;
  assigned_staff?: Array<{ user_id: string; name: string; email: string }>;
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
    /** Volume of one unit in cubic meters (m³) */
    volume_per_unit_m3?: number;
    quantity_requested: number;
    quantity_actual?: number;
    /** Shelf stock for this SKU line before completion (staff snapshot) */
    quantity_on_hand_before?: number;
    /** Shelf stock after completion */
    quantity_on_hand_after?: number;
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
    if (!query.status && !query.allAssigned) q.status = "APPROVED";
  }
  if (query.requestType) q.requestType = query.requestType;
  if (query.status) q.status = query.status;

  const requests = await StorageRequest.find(q).sort({ createdAt: -1 }).lean();
  if (requests.length === 0) return [];

  const contractIds = [...new Set(requests.map((r: any) => r.contractId.toString()))];
  const Contract = (await import("../models/Contract")).default;
  const contracts = await Contract.find({ _id: { $in: contractIds.map((id) => new Types.ObjectId(id)) } })
    .select("_id contractCode warehouseId")
    .lean();
  const contractCodeById = new Map(contracts.map((c: any) => [c._id.toString(), c.contractCode]));
  const contractWarehouseIdById = new Map(
    contracts.map((c: any) => [c._id.toString(), c.warehouseId?.toString?.()])
  );

  // Preload warehouse names for all related contracts.
  const warehouseIds = Array.from(
    new Set(
      contracts
        .map((c: any) => c.warehouseId?.toString?.())
        .filter(Boolean)
    )
  );
  const Warehouse = (await import("../models/Warehouse")).default;
  const warehouses = warehouseIds.length
    ? await Warehouse.find({ _id: { $in: warehouseIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id name")
        .lean()
    : [];
  const warehouseNameById = new Map(warehouses.map((w: any) => [w._id.toString(), w.name]));

  // Preload customer names
  const customerIds = Array.from(
    new Set(
      requests
        .map((r: any) => r.customerId?.toString?.())
        .filter(Boolean)
    )
  );
  const User = (await import("../models/User")).default;
  const customers = customerIds.length
    ? await User.find({ _id: { $in: customerIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id name")
        .lean()
    : [];
  const customerNameById = new Map(customers.map((u: any) => [u._id.toString(), u.name]));

  // Preload assigned staff names
  const assignedStaffIds = Array.from(
    new Set(
      requests
        .flatMap((r: any) => (r.assignedStaffIds || []).map((id: any) => id?.toString?.()))
        .filter(Boolean)
    )
  );
  const assignedStaffUsers = assignedStaffIds.length
    ? await User.find({ _id: { $in: assignedStaffIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id name email")
        .lean()
    : [];
  const assignedStaffById = new Map(
    assignedStaffUsers.map((u: any) => [u._id.toString(), { name: u.name, email: u.email }])
  );

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
      [
        ...details.map((d: any) => d.shelfId?.zoneId?.toString?.()),
        ...requests.map((r: any) => r.requestedZoneId?.toString?.())
      ].filter(Boolean)
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
    const contractIdStr = r.contractId.toString();
    const warehouseId = contractWarehouseIdById.get(contractIdStr);
    return {
      request_id: r._id.toString(),
      contract_id: contractIdStr,
      contract_code: contractCodeById.get(contractIdStr),
      warehouse_id: warehouseId,
      warehouse_name: warehouseId ? warehouseNameById.get(warehouseId) : undefined,
      requested_zone_id: r.requestedZoneId?.toString?.(),
      requested_zone_code: r.requestedZoneId?.toString?.()
        ? zoneCodeById.get(r.requestedZoneId.toString())
        : undefined,
      reference: r.reference,
      customer_id: r.customerId.toString(),
      customer_name: customerNameById.get(r.customerId.toString()),
      request_type: r.requestType,
      status: r.status,
      approved_by: r.approvedBy?.toString?.(),
      approved_at: r.approvedAt,
      customer_confirmed_at: r.customerConfirmedAt,
      assigned_staff: (r.assignedStaffIds || [])
        .map((id: any) => id?.toString?.())
        .filter(Boolean)
        .map((id: string) => ({
          user_id: id,
          name: assignedStaffById.get(id)?.name ?? id,
          email: assignedStaffById.get(id)?.email ?? "",
        })),
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
          volume_per_unit_m3: d.volumePerUnitM3,
          quantity_requested: d.quantityRequested,
          quantity_actual: d.quantityActual,
          quantity_on_hand_before: d.quantityOnHandBefore,
          quantity_on_hand_after: d.quantityOnHandAfter,
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
  const contract = await Contract.findById((req as any).contractId)
    .select("contractCode warehouseId")
    .lean();
  const contract_code = contract ? (contract as any).contractCode : undefined;

  const Warehouse = (await import("../models/Warehouse")).default;
  const warehouse =
    contract && (contract as any).warehouseId
      ? await Warehouse.findById((contract as any).warehouseId)
          .select("name")
          .lean()
      : null;

  const User = (await import("../models/User")).default;
  const customer = await User.findById((req as any).customerId)
    .select("name")
    .lean();
  const assignedStaffIds = ((req as any).assignedStaffIds || []).map((id: any) => id.toString());
  const assignedStaffUsers = assignedStaffIds.length
    ? await User.find({ _id: { $in: assignedStaffIds.map((id: string) => new Types.ObjectId(id)) } })
        .select("_id name email")
        .lean()
    : [];
  const assignedStaffById = new Map(
    assignedStaffUsers.map((u: any) => [u._id.toString(), { name: u.name, email: u.email }])
  );

  const details = await StorageRequestDetail.find({ requestId: req._id })
    .populate("shelfId", "shelfCode zoneId")
    .lean();

  const Zone = (await import("../models/Zone")).default;
  const zoneIds = Array.from(
    new Set(
      [
        ...details.map((d: any) => d.shelfId?.zoneId?.toString?.()),
        (req as any).requestedZoneId?.toString?.()
      ].filter(Boolean)
    )
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
    warehouse_id: (contract as any)?.warehouseId?.toString?.(),
    warehouse_name: warehouse ? (warehouse as any).name : undefined,
    requested_zone_id: (req as any).requestedZoneId?.toString?.(),
    requested_zone_code: (req as any).requestedZoneId?.toString?.()
      ? zoneCodeById.get((req as any).requestedZoneId.toString())
      : undefined,
    reference: (req as any).reference,
    customer_id: (req as any).customerId.toString(),
    customer_name: customer ? (customer as any).name : undefined,
    request_type: (req as any).requestType,
    status: (req as any).status,
    approved_by: (req as any).approvedBy?.toString?.(),
    approved_at: (req as any).approvedAt,
    customer_confirmed_at: (req as any).customerConfirmedAt,
    assigned_staff: assignedStaffIds.map((id: string) => ({
      user_id: id,
      name: assignedStaffById.get(id)?.name ?? id,
      email: assignedStaffById.get(id)?.email ?? "",
    })),
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
        volume_per_unit_m3: d.volumePerUnitM3,
        quantity_requested: d.quantityRequested,
        quantity_actual: d.quantityActual,
        quantity_on_hand_before: d.quantityOnHandBefore,
        quantity_on_hand_after: d.quantityOnHandAfter,
        damage_quantity: d.damageQuantity,
        loss_reason: d.lossReason,
        loss_notes: d.lossNotes
      };
    })
  };
}

