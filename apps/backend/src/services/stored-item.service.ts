import { Types } from "mongoose";
import Contract from "../models/Contract";
import StoredItem from "../models/StoredItem";

export interface StoredItemViewDTO {
  stored_item_id: string;
  contract_id: string;
  shelf_id: string;
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
    allowedShelfIds = contract.rentedShelves.map((rs) => rs.shelfId);
  } else {
    const contracts = await Contract.find({ customerId: new Types.ObjectId(customerId) }).select(
      "_id rentedShelves"
    );
    contractIds = contracts.map((c) => c._id);
    // If querying across all contracts, we don't strictly need shelf filtering
    // because StoredItem is already scoped by contractId; but we can still filter by rented shelves for safety.
    allowedShelfIds = contracts.flatMap((c) => c.rentedShelves.map((rs) => rs.shelfId));
  }

  if (contractIds.length === 0) return [];

  const query: any = { contractId: { $in: contractIds } };
  if (allowedShelfIds && allowedShelfIds.length > 0) {
    query.shelfId = { $in: allowedShelfIds };
  }

  const items = await StoredItem.find(query).sort({ updatedAt: -1 });

  return items.map((it) => ({
    stored_item_id: it._id.toString(),
    contract_id: it.contractId.toString(),
    shelf_id: it.shelfId.toString(),
    item_name: it.itemName,
    quantity: it.quantity,
    unit: it.unit,
    updated_at: it.updatedAt
  }));
}

