import Contract, { IRentedZone } from "../models/Contract";
import Zone from "../models/Zone";
import Shelf from "../models/Shelf";
import Warehouse from "../models/Warehouse";
import User from "../models/User";
import { ContractPackage } from "../models/ContractPackage";
import { Types } from "mongoose";
import { runContractExpirySideEffects } from "./contract-expiry-side-effects.service";
import { runContractTerminationSideEffects } from "./contract-termination-side-effects.service";
import { notifyContractDraftDeletedForCustomer } from "./notification.service";

/**
 * DTO for creating a contract (manager: assign zones)
 */
export interface CreateContractRequest {
  customerId: string;
  warehouseId: string;
  rentedZones: {
    zoneId: string;
    startDate: string | Date;
    endDate: string | Date;
    price: number;
  }[];
}

/**
 * DTO for contract response
 */
export interface ContractResponse {
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_address?: string;
  rented_zones: {
    zone_id: string;
    zone_code?: string;
    zone_name?: string;
    start_date: Date;
    end_date: Date;
    price: number;
  }[];
  requested_zone_id?: string;
  requested_start_date?: Date;
  requested_end_date?: Date;
  status: "draft" | "pending_payment" | "active" | "expired" | "terminated";
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function mapContractToResponse(contract: any): ContractResponse {
  const customerId =
    (contract.customerId as any)?._id?.toString?.() ||
    contract.customerId?.toString?.() ||
    "";
  const warehouseId =
    (contract.warehouseId as any)?._id?.toString?.() ||
    contract.warehouseId?.toString?.() ||
    "";
  const createdBy =
    (contract.createdBy as any)?._id?.toString?.() ||
    contract.createdBy?.toString?.() ||
    "";

  const missingRefs: string[] = [];
  if (!customerId) missingRefs.push("customerId");
  if (!warehouseId) missingRefs.push("warehouseId");
  if (!createdBy) missingRefs.push("createdBy");
  if (missingRefs.length > 0) {
    console.warn(
      `[Contract][MissingRef] contract_id=${contract?._id?.toString?.() || "unknown"} missing=${missingRefs.join(",")}`
    );
  }

  return {
    contract_id: contract._id.toString(),
    contract_code: contract.contractCode,
    customer_id: customerId,
    customer_name: (contract.customerId as any)?.name,
    warehouse_id: warehouseId,
    warehouse_name: (contract.warehouseId as any)?.name,
    warehouse_address: (contract.warehouseId as any)?.address,
    rented_zones: (contract.rentedZones || []).map((rz: any) => ({
      zone_id: rz.zoneId?.toString?.() || "",
      zone_code: (rz.zoneId as any)?.zoneCode,
      zone_name: (rz.zoneId as any)?.name,
      start_date: rz.startDate,
      end_date: rz.endDate,
      price: rz.price
    })),
    requested_zone_id: contract.requestedZoneId?.toString?.(),
    requested_start_date: contract.requestedStartDate,
    requested_end_date: contract.requestedEndDate,
    status: contract.status,
    created_by: createdBy,
    created_at: contract.createdAt,
    updated_at: contract.updatedAt
  };
}

function generateContractCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CT-${timestamp}-${random}`;
}

async function validateCustomer(customerId: string): Promise<void> {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }
  const customer = await User.findById(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }
  if (customer.role !== "customer") {
    throw new Error("User must be a customer");
  }
  if (!customer.isActive) {
    throw new Error("Customer account is not active");
  }
}

async function validateWarehouse(warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(warehouseId)) {
    throw new Error("Invalid warehouse ID");
  }
  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
  if (warehouse.status !== "ACTIVE") {
    throw new Error("Warehouse is not active");
  }
}

async function validateZone(zoneId: string, warehouseId: string): Promise<void> {
  if (!Types.ObjectId.isValid(zoneId)) {
    throw new Error("Invalid zone ID");
  }
  const zone = await Zone.findById(zoneId);
  if (!zone) {
    throw new Error("Zone not found");
  }
  if (zone.warehouseId.toString() !== warehouseId) {
    throw new Error("Zone does not belong to the specified warehouse");
  }
  if (zone.status !== "ACTIVE") {
    throw new Error("Zone is not active");
  }
}

/**
 * Check if a zone is available for [startDate, endDate].
 * No overlap with other reserved/active contracts that rent the same zone (same start/end range).
 * We consider overlapping reservations from `draft`, `pending_payment`, and `active` contracts.
 * excludeContractId: when activating a draft, exclude that contract from the check.
 */
async function checkZoneAvailability(
  zoneId: string,
  startDate: Date,
  endDate: Date,
  excludeContractId?: string
): Promise<{ available: boolean; conflictingContract?: any }> {
  const zoneOid = new Types.ObjectId(zoneId);
  const query: any = {
    // Draft should NOT reserve zone. Only pending_payment (payment window) and active reserve it.
    status: { $in: ["pending_payment", "active"] },
    rentedZones: {
      $elemMatch: {
        zoneId: zoneOid,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    }
  };
  if (excludeContractId) {
    query._id = { $ne: new Types.ObjectId(excludeContractId) };
  }
  const overlapping = await Contract.findOne(query)
    .populate("customerId", "name email")
    .select("contractCode status rentedZones");
  return {
    available: !overlapping,
    conflictingContract: overlapping || undefined
  };
}

/**
 * Find first available zone in warehouse for [startDate, endDate] (no overlap with other active contracts).
 * Returns zone _id or null if none available.
 */
async function findAvailableZoneInWarehouse(
  warehouseId: string,
  startDate: Date,
  endDate: Date,
  excludeContractId?: string
): Promise<Types.ObjectId | null> {
  const zones = await Zone.find({
    warehouseId: new Types.ObjectId(warehouseId),
    status: "ACTIVE"
  })
    .sort({ zoneCode: 1 })
    .select("_id")
    .lean();
  for (const z of zones) {
    const check = await checkZoneAvailability(z._id.toString(), startDate, endDate, excludeContractId);
    if (check.available) {
      return z._id as Types.ObjectId;
    }
  }
  return null;
}

async function validateRentedZones(
  warehouseId: string,
  rentedZones: CreateContractRequest["rentedZones"]
): Promise<void> {
  if (!rentedZones || rentedZones.length === 0) {
    throw new Error("At least one rented zone is required");
  }
  for (const rz of rentedZones) {
    await validateZone(rz.zoneId, warehouseId);
    const startDate = new Date(rz.startDate);
    const endDate = new Date(rz.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid start or end date");
    }
    if (startDate >= endDate) {
      throw new Error("End date must be after start date");
    }
    const startDay = new Date(startDate);
    startDay.setUTCHours(0, 0, 0, 0);
    const todayDay = new Date();
    todayDay.setUTCHours(0, 0, 0, 0);
    if (startDay < todayDay) {
      throw new Error("Start date cannot be in the past");
    }
    if (!rz.price || rz.price <= 0) {
      throw new Error("Price must be greater than 0");
    }
    const check = await checkZoneAvailability(rz.zoneId, startDate, endDate);
    if (!check.available) {
      const zone = await Zone.findById(rz.zoneId);
      const conflict = check.conflictingContract;
      const conflictRz = conflict?.rentedZones?.find((r: any) => r.zoneId.toString() === rz.zoneId);
      throw new Error(
        `Zone ${zone?.zoneCode || rz.zoneId} is already rented in this period by contract ${conflict?.contractCode}. Choose another zone or period.`
      );
    }
  }
}

/**
 * Prevent a single customer from creating multiple drafts/pending/active contracts
 * for the same zone during overlapping periods.
 *
 * This avoids stacking "y chang" contracts for the same zone.
 */
async function validateCustomerZoneDraftUniqueness(params: {
  customerId: string;
  zoneIds: string[];
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  const { customerId, zoneIds, startDate, endDate } = params;
  if (!zoneIds.length) return;

  const customerOid = new Types.ObjectId(customerId);
  const zoneOids = zoneIds.map((z) => new Types.ObjectId(z));

  const existing = await Contract.findOne({
    customerId: customerOid,
    status: { $in: ["draft", "pending_payment", "active"] },
    rentedZones: {
      $elemMatch: {
        zoneId: { $in: zoneOids },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    }
  }).select("contractCode status rentedZones");

  if (existing) {
    throw new Error(
      `You already have a ${existing.status.replace("_", " ")} contract for the selected zone during this period (${existing.contractCode}). Please check your existing contracts.`
    );
  }
}

export async function createContract(
  data: CreateContractRequest,
  createdBy: string
): Promise<ContractResponse> {
  if (!Types.ObjectId.isValid(createdBy)) {
    throw new Error("Invalid creator ID");
  }
  await validateCustomer(data.customerId);
  await validateWarehouse(data.warehouseId);
  await validateRentedZones(data.warehouseId, data.rentedZones);

  let contractCode = generateContractCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await Contract.findOne({ contractCode });
    if (!existing) break;
    contractCode = generateContractCode();
    attempts++;
  }
  if (attempts >= 10) {
    throw new Error("Failed to generate unique contract code");
  }

  const session = await Contract.startSession();
  session.startTransaction();
  try {
    const [created] = await Contract.create(
      [
        {
          contractCode,
          customerId: new Types.ObjectId(data.customerId),
          warehouseId: new Types.ObjectId(data.warehouseId),
          rentedZones: data.rentedZones.map((rz) => ({
            zoneId: new Types.ObjectId(rz.zoneId),
            startDate: new Date(rz.startDate),
            endDate: new Date(rz.endDate),
            price: rz.price
          })),
          status: "draft",
          createdBy: new Types.ObjectId(createdBy)
        }
      ],
      { session }
    );
    await session.commitTransaction();

    const populated = await Contract.findById(created._id)
      .populate("customerId", "name email")
      .populate("warehouseId", "name address")
      .populate("createdBy", "name email")
      .populate("rentedZones.zoneId", "zoneCode name");
    return mapContractToResponse(populated!);
  } catch (e: any) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

// Base price per zone per day (VND)
export const DEFAULT_PRICE_PER_ZONE = 100000;

/**
 * DTO for customer request-draft: warehouse + date range. Zone is auto-assigned when manager approves.
 */
export interface RequestDraftContractRequest {
  warehouseId: string;
  startDate: string | Date;
  endDate: string | Date;
  packageId?: string;
  pricePerZone?: number;
  /** Optional preferred zone selected by customer when requesting draft */
  requestedZoneId?: string;
  /** Optional list of zones selected by customer when requesting draft */
  zoneIds?: string[];
}

async function computeZoneRentalPrice(params: {
  zoneId: string;
  rentalDays: number;
  warehouseId: string;
  packageId?: string;
  fallbackPricePerZone?: number;
}): Promise<number> {
  const { zoneId, rentalDays, warehouseId, packageId, fallbackPricePerZone } = params;
  const zone = await Zone.findById(zoneId).select("area warehouseId");
  if (!zone) throw new Error("Zone not found");
  if (zone.warehouseId.toString() !== warehouseId) {
    throw new Error("Zone does not belong to selected warehouse");
  }

  if (packageId && Types.ObjectId.isValid(packageId)) {
    const pkg = await ContractPackage.findById(packageId).select("warehouseId pricePerM2 pricePerDay isActive");
    if (!pkg) throw new Error("Selected package not found");
    if ((pkg as any).isActive === false) throw new Error("Selected package is disabled");
    if (pkg.warehouseId.toString() !== warehouseId) {
      throw new Error("Selected package does not belong to selected warehouse");
    }
    // Formula: total = (zoneArea * pricePerM2) + (rentalDays * pricePerDay)
    return Math.round((zone.area * (pkg as any).pricePerM2 + rentalDays * (pkg as any).pricePerDay) * 100) / 100;
  }

  if (fallbackPricePerZone && fallbackPricePerZone > 0) {
    return fallbackPricePerZone;
  }
  return DEFAULT_PRICE_PER_ZONE * rentalDays;
}

export async function createDraftContractFromRequest(
  data: RequestDraftContractRequest,
  customerId: string
): Promise<ContractResponse> {
  await validateCustomer(customerId);
  await validateWarehouse(data.warehouseId);

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end date");
  }
  if (startDate >= endDate) {
    throw new Error("End date must be after start date");
  }
  const startDay = new Date(startDate);
  startDay.setUTCHours(0, 0, 0, 0);
  const todayDay = new Date();
  todayDay.setUTCHours(0, 0, 0, 0);
  if (startDay < todayDay) {
    throw new Error("Start date cannot be in the past");
  }

  return createDraftContractWithRequestOnly(data, customerId);
}

async function createDraftContractWithRequestOnly(
  data: RequestDraftContractRequest,
  customerId: string
): Promise<ContractResponse> {
  await validateCustomer(customerId);
  await validateWarehouse(data.warehouseId);

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end date");
  }
  if (startDate >= endDate) {
    throw new Error("End date must be after start date");
  }
  const startDay = new Date(startDate);
  startDay.setUTCHours(0, 0, 0, 0);
  const todayDay = new Date();
  todayDay.setUTCHours(0, 0, 0, 0);
  if (startDay < todayDay) {
    throw new Error("Start date cannot be in the past");
  }

  // If customer selected a preferred zone, ensure it is valid and keep ObjectId
  let requestedZoneObjectId: Types.ObjectId | undefined;
  if (data.requestedZoneId) {
    await validateZone(data.requestedZoneId, data.warehouseId);
    requestedZoneObjectId = new Types.ObjectId(data.requestedZoneId);

    // Block duplicates for the same customer + requested zone during overlapping periods.
    const existing = await Contract.findOne({
      customerId: new Types.ObjectId(customerId),
      status: { $in: ["draft", "pending_payment", "active"] },
      requestedZoneId: new Types.ObjectId(data.requestedZoneId),
      requestedStartDate: { $lte: endDate },
      requestedEndDate: { $gte: startDate }
    }).select("contractCode status");

    if (existing) {
      throw new Error(
        `You already have a ${existing.status.replace("_", " ")} contract for the selected zone during this period (${existing.contractCode}). Please check your existing contracts.`
      );
    }
  }

  // If customer selected specific zones (multi-select), prepare rentedZones upfront
  let rentedZonesDocs: {
    zoneId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    price: number;
  }[] = [];
  if (data.zoneIds && data.zoneIds.length > 0) {
    // Block duplicates for the same customer + zone during overlapping periods.
    // This is independent from the global "zone reservation" rule.
    await validateCustomerZoneDraftUniqueness({
      customerId,
      zoneIds: Array.from(new Set(data.zoneIds)),
      startDate,
      endDate
    });

    // Compute price by selected package and zone area (or fallback rules)
    const diffMs = endDate.getTime() - startDate.getTime();
    const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const uniqueZoneIds = Array.from(new Set(data.zoneIds));
    const draftRentedZones = await Promise.all(
      uniqueZoneIds.map(async (zid) => ({
        zoneId: zid,
        startDate,
        endDate,
        price: await computeZoneRentalPrice({
          zoneId: zid,
          rentalDays,
          warehouseId: data.warehouseId,
          packageId: data.packageId,
          fallbackPricePerZone: data.pricePerZone
        })
      }))
    );
    // Validate against overlaps and zone/warehouse consistency
    await validateRentedZones(
      data.warehouseId,
      draftRentedZones.map((rz) => ({
        zoneId: rz.zoneId,
        startDate: rz.startDate,
        endDate: rz.endDate,
        price: rz.price
      }))
    );
    rentedZonesDocs = draftRentedZones.map((rz) => ({
      zoneId: new Types.ObjectId(rz.zoneId),
      startDate: rz.startDate,
      endDate: rz.endDate,
      price: rz.price
    }));
  }

  let contractCode = generateContractCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await Contract.findOne({ contractCode });
    if (!existing) break;
    contractCode = generateContractCode();
    attempts++;
  }
  if (attempts >= 10) {
    throw new Error("Failed to generate unique contract code");
  }

  const session = await Contract.startSession();
  session.startTransaction();
  try {
    const [contract] = await Contract.create(
      [
        {
          contractCode,
          customerId: new Types.ObjectId(customerId),
          warehouseId: new Types.ObjectId(data.warehouseId),
          rentedZones: rentedZonesDocs,
          requestedZoneId: rentedZonesDocs.length === 0 ? requestedZoneObjectId : undefined,
          requestedStartDate: startDate,
          requestedEndDate: endDate,
          pricingPackageId: data.packageId && Types.ObjectId.isValid(data.packageId)
            ? new Types.ObjectId(data.packageId)
            : undefined,
          status: "draft",
          createdBy: new Types.ObjectId(customerId)
        }
      ],
      { session }
    );
    await session.commitTransaction();

    const populated = await Contract.findById(contract._id)
      .populate("customerId", "name email")
      .populate("warehouseId", "name address")
      .populate("createdBy", "name email")
      .populate("requestedZoneId", "zoneCode name")
      .populate("pricingPackageId", "name");
    return mapContractToResponse(populated!);
  } catch (e: any) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function getContracts(
  userId: string,
  userRole: string
): Promise<ContractResponse[]> {
  const query: any = {};
  if (userRole === "customer") {
    query.customerId = new Types.ObjectId(userId);
  }
  const contracts = await Contract.find(query)
    .populate("customerId", "name email")
    .populate("warehouseId", "name address")
    .populate("createdBy", "name email")
    .populate("rentedZones.zoneId", "zoneCode name")
    .populate("requestedZoneId", "zoneCode name")
    .sort({ createdAt: -1 });
  return contracts.map((c) => mapContractToResponse(c));
}

export async function getContractById(
  contractId: string,
  userId: string,
  userRole: string
): Promise<ContractResponse> {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract ID");
  }
  const contract = await Contract.findById(contractId)
    .populate("customerId", "name email")
    .populate("warehouseId", "name address")
    .populate("createdBy", "name email")
    .populate("rentedZones.zoneId", "zoneCode name")
    .populate("requestedZoneId", "zoneCode name");
  if (!contract) {
    throw new Error("Contract not found");
  }
  const contractCustomerId =
    ((contract.customerId as any)?._id?.toString?.() as string | undefined) ||
    (contract.customerId as any)?.toString?.();
  if (userRole === "customer" && contractCustomerId !== userId) {
    throw new Error("Access denied. You can only view your own contracts.");
  }
  return mapContractToResponse(contract);
}

export async function getContractByCode(
  contractCode: string,
  userId: string,
  userRole: string
): Promise<ContractResponse> {
  const normalized = String(contractCode || "").trim().toUpperCase();
  if (!normalized) throw new Error("contractCode is required");

  const contract = await Contract.findOne({ contractCode: normalized })
    .populate("customerId", "name email")
    .populate("warehouseId", "name address")
    .populate("createdBy", "name email")
    .populate("rentedZones.zoneId", "zoneCode name")
    .populate("requestedZoneId", "zoneCode name");

  if (!contract) {
    throw new Error("Contract not found");
  }

  const contractCustomerId =
    ((contract.customerId as any)?._id?.toString?.() as string | undefined) ||
    (contract.customerId as any)?.toString?.();

  if (userRole === "customer" && contractCustomerId !== userId) {
    throw new Error("Access denied. You can only view your own contracts.");
  }

  return mapContractToResponse(contract);
}

export async function updateContractStatus(
  contractId: string,
  newStatus: "draft" | "pending_payment" | "active" | "expired" | "terminated",
  userId: string,
  userRole: string
): Promise<ContractResponse> {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract ID");
  }
  if (userRole !== "manager") {
    throw new Error("Only managers can update contract status");
  }
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }

  const validTransitions: Record<string, string[]> = {
    draft: ["pending_payment", "active", "terminated"],
    pending_payment: ["active", "terminated"],
    active: ["expired", "terminated"],
    expired: ["terminated"],
    terminated: []
  };
  if (!validTransitions[contract.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${contract.status} to ${newStatus}`);
  }

  const session = await Contract.startSession();
  session.startTransaction();

  try {
    // When manager approves (draft -> pending_payment):
    // - reserve the zone(s) for the payment window
    // - allow other customers to create drafts, but not approve/purchase into the same zone during this window
    if (newStatus === "pending_payment") {
      // If rentedZones are not set yet, assign zone similarly to activation logic.
      if (!contract.rentedZones || contract.rentedZones.length === 0) {
        const reqStart = contract.requestedStartDate;
        const reqEnd = contract.requestedEndDate;
        if (!reqStart || !reqEnd) {
          throw new Error("Contract has no requested period; cannot reserve zone for pending payment.");
        }
        const startDate = new Date(reqStart);
        const endDate = new Date(reqEnd);
        if (startDate >= endDate) {
          throw new Error("Requested start date must be before end date.");
        }

        const warehouseId = contract.warehouseId.toString();
        let zoneIdToAssign: Types.ObjectId | null = null;

        if (contract.requestedZoneId) {
          const check = await checkZoneAvailability(contract.requestedZoneId.toString(), startDate, endDate, contractId);
          if (!check.available) {
            const conflictCode = check.conflictingContract?.contractCode || "another contract";
            throw new Error(
              `Requested zone is not available: the period overlaps with a pending/active contract ${conflictCode}.`
            );
          }
          zoneIdToAssign = contract.requestedZoneId;
        } else {
          zoneIdToAssign = await findAvailableZoneInWarehouse(warehouseId, startDate, endDate, contractId);
          if (!zoneIdToAssign) {
            throw new Error("No zone available in this warehouse for the requested period (pending/active).");
          }
        }

        const diffMs = endDate.getTime() - startDate.getTime();
        const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const price = await computeZoneRentalPrice({
          zoneId: zoneIdToAssign!.toString(),
          rentalDays,
          warehouseId,
          packageId: contract.pricingPackageId?.toString(),
          fallbackPricePerZone: undefined
        });

        contract.rentedZones = [
          {
            zoneId: zoneIdToAssign!,
            startDate,
            endDate,
            price
          }
        ];
      }

      // Validate that every rentedZone is still available for pending payment.
      // (drafts do not reserve, only pending_payment/active do)
      for (const rz of contract.rentedZones || []) {
        const rzStart = new Date(rz.startDate);
        const rzEnd = new Date(rz.endDate);
        const check = await checkZoneAvailability(rz.zoneId.toString(), rzStart, rzEnd, contractId);
        if (!check.available) {
          const zoneCode = (await Zone.findById(rz.zoneId))?.zoneCode || rz.zoneId.toString();
          const conflictCode = check.conflictingContract?.contractCode || "another contract";
          throw new Error(
            `Zone ${zoneCode} is not available for pending payment: overlaps with contract ${conflictCode}.`
          );
        }
      }
    }

    // When manager approves (draft -> active): auto-assign a zone (requested or first available in warehouse)
    if (newStatus === "active" && (!contract.rentedZones || contract.rentedZones.length === 0)) {
      const reqStart = contract.requestedStartDate;
      const reqEnd = contract.requestedEndDate;
      if (!reqStart || !reqEnd) {
        throw new Error("Contract has no requested period; cannot activate.");
      }
      const startDate = new Date(reqStart);
      const endDate = new Date(reqEnd);
      if (startDate >= endDate) {
        throw new Error("Requested start date must be before end date.");
      }
      const warehouseId = contract.warehouseId.toString();
      let zoneIdToAssign: Types.ObjectId | null = null;
      if (contract.requestedZoneId) {
        const check = await checkZoneAvailability(contract.requestedZoneId.toString(), startDate, endDate, contractId);
        if (check.available) {
          zoneIdToAssign = contract.requestedZoneId;
        } else {
          const conflictCode = check.conflictingContract?.contractCode || "another contract";
          throw new Error(
            `Requested zone is not available: the period overlaps with active contract ${conflictCode}. Choose another period or approve without pre-selected zone.`
          );
        }
      } else {
        zoneIdToAssign = await findAvailableZoneInWarehouse(warehouseId, startDate, endDate, contractId);
        if (!zoneIdToAssign) {
          throw new Error(
            "No zone available in this warehouse for the requested period (all zones overlap with other active contracts). Try a different period or warehouse."
          );
        }
      }
      // Price per zone = base daily price * rentalDays
      const diffMs = endDate.getTime() - startDate.getTime();
      const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const price = await computeZoneRentalPrice({
        zoneId: zoneIdToAssign!.toString(),
        rentalDays,
        warehouseId,
        packageId: contract.pricingPackageId?.toString(),
        fallbackPricePerZone: undefined
      });
      contract.rentedZones = [
        {
          zoneId: zoneIdToAssign,
          startDate,
          endDate,
          price
        }
      ];
    }

    contract.status = newStatus;
    await contract.save({ session });

    if (newStatus === "active") {
      for (const rz of contract.rentedZones) {
        await Shelf.updateMany(
          { zoneId: rz.zoneId },
          { status: "RENTED" },
          { session }
        );
      }
    } else if (newStatus === "expired" || newStatus === "terminated") {
      for (const rz of contract.rentedZones) {
        const otherActive = await Contract.countDocuments({
          _id: { $ne: contract._id },
          status: "active",
          "rentedZones.zoneId": rz.zoneId
        });
        if (otherActive === 0) {
          await Shelf.updateMany(
            { zoneId: rz.zoneId },
            { status: "AVAILABLE" },
            { session }
          );
        }
      }
    }

    await session.commitTransaction();

    if (newStatus === "expired") {
      try {
        await runContractExpirySideEffects({
          _id: contract._id,
          customerId: contract.customerId,
          contractCode: contract.contractCode
        });
      } catch (e: any) {
        console.error("[Contract] runContractExpirySideEffects failed", e?.message || e);
      }
    }

    if (newStatus === "terminated") {
      try {
        await runContractTerminationSideEffects({
          _id: contract._id,
          customerId: contract.customerId,
          contractCode: contract.contractCode
        });
      } catch (e: any) {
        console.error("[Contract] runContractTerminationSideEffects failed", e?.message || e);
      }
    }

    const updated = await Contract.findById(contractId)
      .populate("customerId", "name email")
      .populate("warehouseId", "name address")
      .populate("createdBy", "name email")
      .populate("rentedZones.zoneId", "zoneCode name")
      .populate("requestedZoneId", "zoneCode name");
    return mapContractToResponse(updated!);
  } catch (e: any) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function deleteDraftContract(
  contractId: string,
  userId: string,
  userRole: string,
  reason: string
): Promise<{ contract_id: string; contract_code: string; deleted: true }> {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract ID");
  }
  if (!Types.ObjectId.isValid(userId) || userRole !== "manager") {
    throw new Error("Only managers can delete draft contracts");
  }

  const contract = await Contract.findById(contractId).select("_id contractCode status customerId");
  if (!contract) {
    throw new Error("Contract not found");
  }
  if (contract.status !== "draft") {
    throw new Error("Only draft contracts can be deleted");
  }
  const cleanedReason = String(reason || "").trim();
  if (!cleanedReason) {
    throw new Error("Delete reason is required");
  }

  await Contract.deleteOne({ _id: contract._id });

  try {
    await notifyContractDraftDeletedForCustomer({
      contractId: contract._id.toString(),
      customerId: contract.customerId.toString(),
      contractCode: contract.contractCode,
      reason: cleanedReason
    });
  } catch (e: any) {
    console.error("[Contract] notifyContractDraftDeletedForCustomer failed", e?.message || e);
  }

  return {
    contract_id: contract._id.toString(),
    contract_code: contract.contractCode,
    deleted: true
  };
}
