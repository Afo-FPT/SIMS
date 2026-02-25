import Contract, { IRentedZone } from "../models/Contract";
import Zone from "../models/Zone";
import Shelf from "../models/Shelf";
import Warehouse from "../models/Warehouse";
import User from "../models/User";
import { Types } from "mongoose";

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
  return {
    contract_id: contract._id.toString(),
    contract_code: contract.contractCode,
    customer_id: contract.customerId.toString(),
    customer_name: (contract.customerId as any)?.name,
    warehouse_id: contract.warehouseId.toString(),
    warehouse_name: (contract.warehouseId as any)?.name,
    rented_zones: (contract.rentedZones || []).map((rz: any) => ({
      zone_id: rz.zoneId?.toString?.() ?? rz.zoneId.toString(),
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
    created_by: contract.createdBy.toString(),
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
 * No overlap with other ACTIVE contracts that rent the same zone (same start/end range).
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
    status: "active",
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

const DEFAULT_PRICE_PER_ZONE = 100000;

/**
 * DTO for customer request-draft: warehouse + date range. Zone is auto-assigned when manager approves.
 */
export interface RequestDraftContractRequest {
  warehouseId: string;
  startDate: string | Date;
  endDate: string | Date;
  pricePerZone?: number;
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
          rentedZones: [],
          requestedZoneId: undefined,
          requestedStartDate: startDate,
          requestedEndDate: endDate,
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
      .populate("requestedZoneId", "zoneCode name");
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
  if (userRole === "customer" && contract.customerId.toString() !== userId) {
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
      const price = DEFAULT_PRICE_PER_ZONE;
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
