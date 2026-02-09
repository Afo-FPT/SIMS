import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";
import StoredItem from "../models/StoredItem";

export interface StaffCompleteRequestItemDTO {
  requestDetailId: string;
  quantityActual: number;
  /** For IN requests: staff must choose shelf for putaway */
  shelfId?: string;
  /** Optional: quantity damaged/lost (for customer visibility) */
  damageQuantity?: number;
  lossReason?: string;
  lossNotes?: string;
}

export interface StaffCompleteStorageRequestDTO {
  items: StaffCompleteRequestItemDTO[];
}

export interface StaffCompleteStorageRequestResponseDTO {
  request_id: string;
  request_type: "IN" | "OUT";
  final_status: "DONE_BY_STAFF";
  items: Array<{
    request_detail_id: string;
    shelf_id: string;
    item_name: string;
    unit: string;
    quantity_requested: number;
    quantity_actual: number;
  }>;
  updated_at: Date;
}

function validateStaffCompleteDTO(dto: StaffCompleteStorageRequestDTO) {
  if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
    throw new Error("items is required and must not be empty");
  }

  const seen = new Set<string>();
  dto.items.forEach((it, idx) => {
    if (!it.requestDetailId || it.requestDetailId.trim().length === 0) {
      throw new Error(`items[${idx}].requestDetailId is required`);
    }
    if (!Types.ObjectId.isValid(it.requestDetailId)) {
      throw new Error(`items[${idx}].requestDetailId is invalid`);
    }
    if (seen.has(it.requestDetailId)) {
      throw new Error(`items[${idx}].requestDetailId is duplicated`);
    }
    seen.add(it.requestDetailId);

    if (typeof it.quantityActual !== "number" || isNaN(it.quantityActual)) {
      throw new Error(`items[${idx}].quantityActual must be a valid number`);
    }
    if (it.quantityActual < 0) {
      throw new Error(`items[${idx}].quantityActual must be >= 0`);
    }
  });
}

async function validateShelfBelongsToContract(params: {
  contractId: Types.ObjectId;
  shelfId: Types.ObjectId;
  session: any;
}): Promise<void> {
  const Contract = (await import("../models/Contract")).default;
  const Shelf = (await import("../models/Shelf")).default;

  const contract = await Contract.findById(params.contractId).session(params.session);
  if (!contract) throw new Error("Contract not found");

  const shelf = await Shelf.findById(params.shelfId).session(params.session);
  if (!shelf) throw new Error("Shelf not found");

  const zoneIds = (contract.rentedZones || []).map((rz: any) => rz.zoneId.toString());
  if (!zoneIds.includes(shelf.zoneId.toString())) {
    throw new Error("Shelf does not belong to the contract (shelf's zone is not rented by this contract)");
  }
}

async function getTotalStoredQuantity(params: {
  contractId: Types.ObjectId;
  shelfId: Types.ObjectId;
  itemName: string;
  unit: string;
  session: any;
}): Promise<number> {
  const rows = await StoredItem.aggregate([
    {
      $match: {
        contractId: params.contractId,
        shelfId: params.shelfId,
        itemName: params.itemName,
        unit: params.unit
      }
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } }
  ]).session(params.session);

  return rows?.[0]?.total ?? 0;
}

async function decreaseStoredQuantity(params: {
  contractId: Types.ObjectId;
  shelfId: Types.ObjectId;
  itemName: string;
  unit: string;
  quantity: number;
  session: any;
}): Promise<void> {
  let remaining = params.quantity;
  if (remaining <= 0) return;

  const docs = await StoredItem.find({
    contractId: params.contractId,
    shelfId: params.shelfId,
    itemName: params.itemName,
    unit: params.unit
  })
    .sort({ _id: 1 })
    .session(params.session);

  for (const doc of docs) {
    if (remaining <= 0) break;
    const take = Math.min(doc.quantity, remaining);
    const newQty = doc.quantity - take;
    remaining -= take;

    if (newQty <= 0) {
      await StoredItem.deleteOne({ _id: doc._id }).session(params.session);
    } else {
      doc.quantity = newQty;
      await doc.save({ session: params.session });
    }
  }

  if (remaining > 0) {
    throw new Error("Not enough stored quantity to complete outbound request");
  }
}

/**
 * STAFF completes an APPROVED storage request.
 * - IN: increases StoredItem quantities
 * - OUT: decreases StoredItem quantities (must not go negative)
 * - Marks request status: APPROVED -> DONE_BY_STAFF
 * - Writes quantityActual to each StorageRequestDetail
 * - If request has assignedStaffIds, only those staff can complete.
 */
export async function staffCompleteStorageRequest(
  requestId: string,
  dto: StaffCompleteStorageRequestDTO,
  staffUserId?: string
): Promise<StaffCompleteStorageRequestResponseDTO> {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error("Invalid request id");
  }
  validateStaffCompleteDTO(dto);

  const session = await StorageRequest.startSession();
  session.startTransaction();

  try {
    const request = await StorageRequest.findById(requestId).session(session);
    if (!request) {
      throw new Error("Storage request not found");
    }
    if (request.status !== "APPROVED") {
      throw new Error("Only APPROVED requests can be completed by staff");
    }
    const assignedIds = (request as any).assignedStaffIds || [];
    if (assignedIds.length > 0 && staffUserId) {
      const allowed = assignedIds.some((id: any) => id.toString() === staffUserId);
      if (!allowed) {
        throw new Error("You are not assigned to this request");
      }
    }

    const details = await StorageRequestDetail.find({ requestId: request._id }).session(
      session
    );
    if (!details || details.length === 0) {
      throw new Error("Storage request has no items");
    }

    const detailById = new Map(details.map((d) => [d._id.toString(), d]));

    // For inbound: staff must provide shelfId for each detail (putaway)
    if (request.requestType === "IN") {
      for (const it of dto.items) {
        const detail = detailById.get(it.requestDetailId);
        if (!detail) continue;
        if (!it.shelfId || !Types.ObjectId.isValid(it.shelfId)) {
          throw new Error("shelfId is required and must be valid for inbound completion");
        }
      }
    }

    // Validate all incoming detail ids belong to this request and quantities are within requested
    for (const it of dto.items) {
      const detail = detailById.get(it.requestDetailId);
      if (!detail) {
        throw new Error("requestDetailId does not belong to this request");
      }
      if (it.quantityActual > detail.quantityRequested) {
        throw new Error("quantityActual must be <= quantityRequested");
      }
    }

    // For outbound: verify stored quantity is sufficient before mutating anything
    if (request.requestType === "OUT") {
      for (const it of dto.items) {
        const detail = detailById.get(it.requestDetailId)!;
        const unit = (detail as any).unit || "pcs";

        const available = await getTotalStoredQuantity({
          contractId: request.contractId,
          shelfId: detail.shelfId,
          itemName: detail.itemName,
          unit,
          session
        });

        if (available < it.quantityActual) {
          throw new Error(
            `Not enough stored quantity for item '${detail.itemName}' on shelf '${detail.shelfId.toString()}'`
          );
        }
      }
    }

    // Apply quantityActual updates + StoredItem adjustments
    for (const it of dto.items) {
      const detail = detailById.get(it.requestDetailId)!;
      const unit = (detail as any).unit || "pcs";

      // For inbound: assign shelfId now (putaway), and validate it belongs to contract's zone(s)
      if (request.requestType === "IN") {
        const shelfId = new Types.ObjectId(it.shelfId as string);
        await validateShelfBelongsToContract({ contractId: request.contractId, shelfId, session });
        (detail as any).shelfId = shelfId;
      }

      detail.quantityActual = it.quantityActual;
      if (it.damageQuantity != null && !isNaN(it.damageQuantity) && it.damageQuantity >= 0) {
        (detail as any).damageQuantity = it.damageQuantity;
      }
      if (it.lossReason != null && typeof it.lossReason === "string") {
        (detail as any).lossReason = it.lossReason.trim() || undefined;
      }
      if (it.lossNotes != null && typeof it.lossNotes === "string") {
        (detail as any).lossNotes = it.lossNotes.trim() || undefined;
      }
      await detail.save({ session });

      if (it.quantityActual <= 0) continue;

      if (request.requestType === "IN") {
        await StoredItem.findOneAndUpdate(
          {
            contractId: request.contractId,
            shelfId: detail.shelfId,
            itemName: detail.itemName,
            unit
          },
          { $inc: { quantity: it.quantityActual } },
          { upsert: true, new: true, setDefaultsOnInsert: true, session }
        );
      } else {
        await decreaseStoredQuantity({
          contractId: request.contractId,
          shelfId: detail.shelfId,
          itemName: detail.itemName,
          unit,
          quantity: it.quantityActual,
          session
        });
      }
    }

    request.status = "DONE_BY_STAFF";
    await request.save({ session });

    const updatedDetails = await StorageRequestDetail.find({ requestId: request._id }).session(
      session
    );

    await session.commitTransaction();

    return {
      request_id: request._id.toString(),
      request_type: request.requestType,
      final_status: "DONE_BY_STAFF",
      items: updatedDetails.map((d) => ({
        request_detail_id: d._id.toString(),
        shelf_id: d.shelfId?.toString?.() ?? "",
        item_name: d.itemName,
        unit: (d as any).unit || "pcs",
        quantity_requested: d.quantityRequested,
        quantity_actual: d.quantityActual ?? 0
      })),
      updated_at: request.updatedAt
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

