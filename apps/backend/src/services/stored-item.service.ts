import { Types } from "mongoose";
import Contract from "../models/Contract";
import Shelf from "../models/Shelf";
import StoredItem from "../models/StoredItem";
import Zone from "../models/Zone";

export interface StoredItemViewDTO {
  stored_item_id: string;
  contract_id: string;
  contract_code?: string;
  shelf_id: string;
  shelf_code?: string;
  zone_code?: string;
  warehouse_name?: string;
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
  warehouse_name?: string;
  zone_codes?: string[];
  total_quantity: number;
  unit: string;
  quantity_per_unit?: number;
  volume_per_unit_m3?: number;
  last_updated: Date;
}

export interface StoredProductShelfDTO {
  shelf: string;
  zone_code?: string;
  quantity: number;
  unit: string;
  quantity_per_unit?: number;
  volume_per_unit_m3?: number;
  last_updated: Date;
  contract_id: string;
  contract_code?: string;
}

export interface StoredZoneProductsDTO {
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit: string;
  zone_codes: string[];
  shelf_count: number;
  last_updated: Date;
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

async function resolveCustomerContractsAndZones(params: {
  customerId: string;
  contractCode?: string;
}): Promise<{ contractIds: Types.ObjectId[]; zoneIds: Types.ObjectId[] }> {
  const { customerId, contractCode } = params;
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer id");
  }

  if (contractCode) {
    const normalized = String(contractCode).trim().toUpperCase();
    const contract = await Contract.findOne({
      customerId: new Types.ObjectId(customerId),
      contractCode: normalized,
    }).select("_id rentedZones");
    if (!contract) {
      throw new Error("Contract not found for this customer");
    }
    const zoneIds = (contract.rentedZones || []).map((rz: any) => rz.zoneId);
    return { contractIds: [contract._id], zoneIds };
  }

  const contracts = await Contract.find({ customerId: new Types.ObjectId(customerId) }).select(
    "_id rentedZones"
  );
  const contractIds = contracts.map((c) => c._id);
  const zoneIds = contracts.flatMap((c) => (c.rentedZones || []).map((rz: any) => rz.zoneId));
  return { contractIds, zoneIds };
}

/**
 * CUSTOMER: list products currently stored inside a specific rented zone or warehouse.
 *
 * - If contractCode is provided, scope to that contract's rented zones.
 * - zoneCode OR warehouseId must be provided.
 * - Only zones that the customer is currently renting (via rentedZones) are allowed.
 */
export async function getMyStoredProductsInZoneOrWarehouse(params: {
  customerId: string;
  zoneCode?: string;
  warehouseId?: string;
  contractCode?: string;
}): Promise<StoredZoneProductsDTO[]> {
  const { customerId, zoneCode, warehouseId, contractCode } = params;

  const resolved = await resolveCustomerContractsAndZones({ customerId, contractCode });
  const contractIds = resolved.contractIds;
  const allowedZoneIds = resolved.zoneIds;
  if (contractIds.length === 0) return [];

  if (!zoneCode && !warehouseId) {
    throw new Error("zoneCode or warehouseId is required");
  }

  let targetZones: Array<{ _id: Types.ObjectId; zoneCode: string }> = [];

  if (zoneCode) {
    const normalized = String(zoneCode).trim().toUpperCase();
    const z = await Zone.findOne({ zoneCode: normalized }).select("_id zoneCode warehouseId").lean();
    if (!z) throw new Error("Zone not found");
    const isAllowed = allowedZoneIds.some((id) => id.toString() === (z as any)._id.toString());
    if (!isAllowed) {
      const allowedZones = await Zone.find({ _id: { $in: allowedZoneIds } })
        .select("zoneCode")
        .lean();
      const allowedCodes = allowedZones.map((x: any) => x.zoneCode).filter(Boolean).sort();
      throw new Error(
        `Zone is not in your rented area. Allowed zone codes: ${allowedCodes.join(", ") || "(none)"}`
      );
    }
    targetZones = [{ _id: z._id as any, zoneCode: z.zoneCode }];
  } else if (warehouseId) {
    if (!Types.ObjectId.isValid(warehouseId)) throw new Error("Invalid warehouseId");
    if (allowedZoneIds.length === 0) return [];
    const zones = await Zone.find({
      _id: { $in: allowedZoneIds },
      warehouseId: new Types.ObjectId(warehouseId),
    })
      .select("_id zoneCode")
      .lean();
    targetZones = zones.map((z) => ({ _id: z._id as any, zoneCode: z.zoneCode }));
  }

  if (targetZones.length === 0) return [];

  const zoneIds = targetZones.map((z) => z._id);
  const zoneCodeById = new Map<string, string>();
  for (const z of targetZones) zoneCodeById.set(z._id.toString(), z.zoneCode);

  const shelves = await Shelf.find({ zoneId: { $in: zoneIds } })
    .select("_id shelfCode zoneId")
    .lean();
  const shelfIds = shelves.map((s) => s._id as any);
  if (shelfIds.length === 0) return [];

  const shelfZoneById = new Map<string, string>();
  for (const s of shelves) {
    shelfZoneById.set((s._id as any).toString(), (s.zoneId as any).toString());
  }

  const items = await StoredItem.find({
    contractId: { $in: contractIds },
    shelfId: { $in: shelfIds },
  })
    .select("itemName quantity unit updatedAt shelfId")
    .lean();

  const agg = new Map<
    string,
    {
      product_id: string;
      product_name: string;
      total_quantity: number;
      unit: string;
      zone_codes: Set<string>;
      shelf_ids: Set<string>;
      last_updated: Date;
    }
  >();

  for (const it of items) {
    const sku = normalizeSku((it as any).itemName);
    const key = sku.toLowerCase();
    const shelfIdStr = (it as any).shelfId?.toString?.() ?? String((it as any).shelfId);
    const zoneIdStr = shelfZoneById.get(shelfIdStr);
    const zoneCodeVal = zoneIdStr ? zoneCodeById.get(zoneIdStr) : undefined;

    const existing = agg.get(key);
    if (!existing) {
      agg.set(key, {
        product_id: sku,
        product_name: sku,
        total_quantity: Number((it as any).quantity) || 0,
        unit: String((it as any).unit || "pcs"),
        zone_codes: new Set(zoneCodeVal ? [zoneCodeVal] : []),
        shelf_ids: new Set([shelfIdStr]),
        last_updated: (it as any).updatedAt ? new Date((it as any).updatedAt) : new Date(0),
      });
    } else {
      existing.total_quantity += Number((it as any).quantity) || 0;
      existing.shelf_ids.add(shelfIdStr);
      if (zoneCodeVal) existing.zone_codes.add(zoneCodeVal);
      const updated = (it as any).updatedAt ? new Date((it as any).updatedAt) : new Date(0);
      if (updated.getTime() > existing.last_updated.getTime()) existing.last_updated = updated;
      if (!existing.unit && (it as any).unit) existing.unit = String((it as any).unit);
    }
  }

  return Array.from(agg.values())
    .map((v) => ({
      product_id: v.product_id,
      product_name: v.product_name,
      total_quantity: v.total_quantity,
      unit: v.unit,
      zone_codes: Array.from(v.zone_codes).sort(),
      shelf_count: v.shelf_ids.size,
      last_updated: v.last_updated,
    }))
    .sort((a, b) => a.product_name.localeCompare(b.product_name));
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

  const shelfIds = items.map((it: any) => it.shelfId?._id ?? it.shelfId).filter(Boolean);
  const shelves = await Shelf.find({ _id: { $in: shelfIds } })
    .populate({
      path: "zoneId",
      select: "zoneCode warehouseId",
      populate: { path: "warehouseId", select: "name" },
    })
    .select("_id zoneId")
    .lean();

  const shelfMetaById = new Map<
    string,
    {
      zone_code?: string;
      warehouse_name?: string;
    }
  >();
  for (const s of shelves as any[]) {
    const zone = s.zoneId;
    shelfMetaById.set(String(s._id), {
      zone_code: zone?.zoneCode,
      warehouse_name: zone?.warehouseId?.name,
    });
  }

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
    zone_code: shelfMetaById.get(((it as any).shelfId?._id?.toString?.() ?? (it.shelfId as any).toString()))?.zone_code,
    warehouse_name: shelfMetaById.get(((it as any).shelfId?._id?.toString?.() ?? (it.shelfId as any).toString()))?.warehouse_name,
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
        warehouse_name: it.warehouse_name,
        zone_codes: it.zone_code ? [it.zone_code] : [],
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
      if (!existing.warehouse_name && it.warehouse_name) {
        existing.warehouse_name = it.warehouse_name;
      }
      if (it.zone_code) {
        const next = new Set(existing.zone_codes || []);
        next.add(it.zone_code);
        existing.zone_codes = Array.from(next).sort();
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
      zone_code: it.zone_code,
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

