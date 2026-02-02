import { Types } from "mongoose";
import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import StoredItem from "../models/StoredItem";

export interface StoredItemViewDTO {
  stored_item_id: string;
  contract_id: string;
  shelf_id: string;
  shelf_code?: string;
  item_name: string;
  quantity: number;
  unit: string;
  updated_at: Date;
}

async function validateContractOwnership(contractId: string, customerId: string) {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract id");
  }
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }
  if (contract.customerId.toString() !== customerId) {
    throw new Error("Contract does not belong to the authenticated customer");
  }
  return contract;
}

/**
 * CUSTOMER views stored items in their rented shelves.
 * - If contractId is provided: returns items for that contract (only if owned by customer)
 * - Else: returns items across all contracts owned by customer
 */
export async function getMyStoredItems(
  customerId: string,
  contractId?: string
): Promise<StoredItemViewDTO[]> {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer id");
  }

  let contractIds: Types.ObjectId[] = [];
  let allowedShelfIds: Types.ObjectId[] | null = null;

  if (contractId) {
    const contract = await validateContractOwnership(contractId, customerId);
    contractIds = [contract._id];
    const zoneIds = (contract.rentedZones || []).map((rz) => rz.zoneId);
    if (zoneIds.length > 0) {
      const shelves = await Shelf.find({ zoneId: { $in: zoneIds } }).select("_id");
      allowedShelfIds = shelves.map((s) => s._id);
    }
  } else {
    const contracts = await Contract.find({ customerId: new Types.ObjectId(customerId) }).select(
      "_id rentedZones"
    );
    contractIds = contracts.map((c) => c._id);
    const zoneIds = contracts.flatMap((c) => (c.rentedZones || []).map((rz) => rz.zoneId));
    if (zoneIds.length > 0) {
      const shelves = await Shelf.find({ zoneId: { $in: zoneIds } }).select("_id");
      allowedShelfIds = shelves.map((s) => s._id);
    }
  }

  if (contractIds.length === 0) return [];

  const query: any = { contractId: { $in: contractIds } };
  if (allowedShelfIds && allowedShelfIds.length > 0) {
    query.shelfId = { $in: allowedShelfIds };
  }

  const items = await StoredItem.find(query)
    .populate("shelfId", "shelfCode")
    .sort({ updatedAt: -1 });

  return items.map((it) => ({
    stored_item_id: it._id.toString(),
    contract_id: it.contractId.toString(),
    shelf_id: (it as any).shelfId?._id?.toString?.() ?? (it.shelfId as any).toString(),
    shelf_code:
      typeof (it as any).shelfId === "object" && "shelfCode" in (it as any).shelfId
        ? (it as any).shelfId.shelfCode
        : undefined,
    item_name: it.itemName,
    quantity: it.quantity,
    unit: it.unit,
    updated_at: it.updatedAt
  }));
}

