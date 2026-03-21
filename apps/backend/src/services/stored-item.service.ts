import { Types } from "mongoose";
import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import StoredItem from "../models/StoredItem";

export interface StoredItemViewDTO {
  stored_item_id: string;
  contract_id: string;
  contract_code?: string;
  shelf_id: string;
  shelf_code?: string;
  item_name: string;
  quantity: number;
  unit: string;
   /** Optional: default quantity per unit/package for this SKU */
  quantity_per_unit?: number;
  /** Optional: volume of one unit in m3 */
  volume_per_unit_m3?: number;
  updated_at: Date;
}

export interface StoredProductOverviewDTO {
  product_id: string;
  sku: string;
  contract_id: string;
  contract_code?: string;
  total_quantity: number;
  unit: string;
  quantity_per_unit?: number;
  volume_per_unit_m3?: number;
  last_updated: Date;
}

export interface StoredProductShelfDTO {
  shelf: string;
  quantity: number;
  unit: string;
  quantity_per_unit?: number;
  volume_per_unit_m3?: number;
  last_updated: Date;
  contract_id: string;
  contract_code?: string;
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
    .populate("contractId", "contractCode")
    .sort({ updatedAt: -1 });

  return items.map((it) => ({
    stored_item_id: it._id.toString(),
    contract_id:
      typeof (it as any).contractId === "object" && (it as any).contractId?._id
        ? (it as any).contractId._id.toString()
        : (it.contractId as any).toString(),
    contract_code:
      typeof (it as any).contractId === "object" && "contractCode" in (it as any).contractId
        ? (it as any).contractId.contractCode
        : undefined,
    shelf_id: (it as any).shelfId?._id?.toString?.() ?? (it.shelfId as any).toString(),
    shelf_code:
      typeof (it as any).shelfId === "object" && "shelfCode" in (it as any).shelfId
        ? (it as any).shelfId.shelfCode
        : undefined,
    item_name: it.itemName,
    quantity: it.quantity,
    unit: it.unit,
    quantity_per_unit: (it as any).quantityPerUnit,
    volume_per_unit_m3: (it as any).volumePerUnitM3,
    updated_at: it.updatedAt
  }));
}

function normalizeSku(s: string): string {
  return (s || "").trim();
}

/**
 * CUSTOMER product overview (grouped by SKU within contract)
 * This avoids listing the same SKU multiple times across shelves.
 */
export async function getMyStoredProducts(
  customerId: string,
  contractId?: string
): Promise<StoredProductOverviewDTO[]> {
  const items = await getMyStoredItems(customerId, contractId);

  const map = new Map<string, StoredProductOverviewDTO>();
  for (const it of items) {
    const sku = normalizeSku(it.item_name);
    const key = `${it.contract_id}::${sku.toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        product_id: sku,
        sku,
        contract_id: it.contract_id,
        contract_code: it.contract_code,
        total_quantity: it.quantity || 0,
        unit: it.unit,
        quantity_per_unit: it.quantity_per_unit,
        volume_per_unit_m3: it.volume_per_unit_m3,
        last_updated: it.updated_at
      });
    } else {
      existing.total_quantity += it.quantity || 0;
      // latest updated_at
      if (new Date(it.updated_at).getTime() > new Date(existing.last_updated).getTime()) {
        existing.last_updated = it.updated_at;
      }
      // contract_code should be identical per contract; keep first non-empty
      if (!existing.contract_code && it.contract_code) {
        existing.contract_code = it.contract_code;
      }
      // prefer a known quantity_per_unit if missing
      if (existing.quantity_per_unit == null && it.quantity_per_unit != null) {
        existing.quantity_per_unit = it.quantity_per_unit;
      }
      if (existing.volume_per_unit_m3 == null && it.volume_per_unit_m3 != null) {
        existing.volume_per_unit_m3 = it.volume_per_unit_m3;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.sku === b.sku) return a.contract_id.localeCompare(b.contract_id);
    return a.sku.localeCompare(b.sku);
  });
}

/**
 * CUSTOMER product detail (shelf distribution) for a SKU.
 * Optionally scoped to a contractId.
 */
export async function getMyStoredProductShelves(
  customerId: string,
  sku: string,
  contractId?: string
): Promise<StoredProductShelfDTO[]> {
  const items = await getMyStoredItems(customerId, contractId);
  const target = normalizeSku(sku).toLowerCase();

  const rows: StoredProductShelfDTO[] = [];
  for (const it of items) {
    if (normalizeSku(it.item_name).toLowerCase() !== target) continue;
    rows.push({
      shelf: it.shelf_code || it.shelf_id,
      quantity: it.quantity,
      unit: it.unit,
      quantity_per_unit: it.quantity_per_unit,
      volume_per_unit_m3: it.volume_per_unit_m3,
      last_updated: it.updated_at,
      contract_id: it.contract_id
      ,
      contract_code: it.contract_code
    });
  }

  rows.sort((a, b) => (a.shelf || "").localeCompare(b.shelf || ""));
  return rows;
}

