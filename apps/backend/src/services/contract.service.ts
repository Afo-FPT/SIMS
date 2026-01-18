import Contract, { IRentedShelf } from "../models/Contract";
import Shelf from "../models/Shelf";
import Warehouse from "../models/Warehouse";
import User from "../models/User";
import { Types } from "mongoose";

/**
 * DTO for creating a contract
 */
export interface CreateContractRequest {
  customerId: string;
  warehouseId: string;
  rentedShelves: {
    shelfId: string;
    area?: number;
    capacity?: number;
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
  warehouse_id: string;
  rented_shelves: {
    shelf_id: string;
    area?: number;
    capacity?: number;
    start_date: Date;
    end_date: Date;
    price: number;
  }[];
  status: "draft" | "active" | "expired" | "terminated";
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Generate unique contract code
 */
function generateContractCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CT-${timestamp}-${random}`;
}

/**
 * Validate customer exists and is a customer role
 */
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

/**
 * Validate warehouse exists
 */
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

/**
 * Validate shelf exists and belongs to warehouse
 * Customer rents the entire shelf (all tiers)
 */
async function validateShelf(
  shelfId: string,
  warehouseId: string
): Promise<void> {
  if (!Types.ObjectId.isValid(shelfId)) {
    throw new Error("Invalid shelf ID");
  }

  const shelf = await Shelf.findById(shelfId);
  if (!shelf) {
    throw new Error("Shelf not found");
  }

  // Check shelf belongs to warehouse
  if (shelf.warehouseId.toString() !== warehouseId) {
    throw new Error("Shelf does not belong to the specified warehouse");
  }

  // Check shelf is available (not already rented or under maintenance)
  if (shelf.status === "MAINTENANCE") {
    throw new Error("Shelf is under maintenance");
  }

  if (shelf.status === "RENTED") {
    throw new Error("Shelf is already rented");
  }
}

/**
 * Check if shelf is already rented during the period
 * Customer rents the entire shelf (all tiers), so we check by shelfId only
 */
async function checkShelfAvailability(
  shelfId: string,
  startDate: Date,
  endDate: Date,
  excludeContractId?: string
): Promise<boolean> {
  const query: any = {
    status: { $in: ["draft", "active"] },
    "rentedShelves.shelfId": new Types.ObjectId(shelfId),
    $or: [
      // Contract starts during existing contract
      {
        "rentedShelves.startDate": { $lte: startDate },
        "rentedShelves.endDate": { $gte: startDate }
      },
      // Contract ends during existing contract
      {
        "rentedShelves.startDate": { $lte: endDate },
        "rentedShelves.endDate": { $gte: endDate }
      },
      // Contract completely overlaps existing contract
      {
        "rentedShelves.startDate": { $gte: startDate },
        "rentedShelves.endDate": { $lte: endDate }
      }
    ]
  };

  if (excludeContractId) {
    query._id = { $ne: new Types.ObjectId(excludeContractId) };
  }

  const overlappingContract = await Contract.findOne(query);
  return !overlappingContract; // Return true if available (no overlap)
}

/**
 * Validate rented shelves
 */
async function validateRentedShelves(
  warehouseId: string,
  rentedShelves: CreateContractRequest["rentedShelves"]
): Promise<void> {
  if (!rentedShelves || rentedShelves.length === 0) {
    throw new Error("At least one rented shelf is required");
  }

  // Validate each shelf
  for (const rentedShelf of rentedShelves) {
    // Validate shelf exists and belongs to warehouse
    await validateShelf(rentedShelf.shelfId, warehouseId);

    // Validate dates
    const startDate = new Date(rentedShelf.startDate);
    const endDate = new Date(rentedShelf.endDate);

    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date");
    }

    if (isNaN(endDate.getTime())) {
      throw new Error("Invalid end date");
    }

    if (startDate >= endDate) {
      throw new Error("End date must be after start date");
    }

    if (startDate < new Date()) {
      throw new Error("Start date cannot be in the past");
    }

    // Validate price
    if (!rentedShelf.price || rentedShelf.price <= 0) {
      throw new Error("Price must be greater than 0");
    }

    // Check availability (entire shelf)
    const isAvailable = await checkShelfAvailability(
      rentedShelf.shelfId,
      startDate,
      endDate
    );

    if (!isAvailable) {
      const shelf = await Shelf.findById(rentedShelf.shelfId);
      throw new Error(
        `Shelf ${shelf?.shelfCode} is already rented during this period`
      );
    }
  }
}

/**
 * Create a new contract
 */
export async function createContract(
  data: CreateContractRequest,
  createdBy: string
): Promise<ContractResponse> {
  // Validate manager
  if (!Types.ObjectId.isValid(createdBy)) {
    throw new Error("Invalid manager ID");
  }

  // Validate customer
  await validateCustomer(data.customerId);

  // Validate warehouse
  await validateWarehouse(data.warehouseId);

  // Validate rented shelves
  await validateRentedShelves(data.warehouseId, data.rentedShelves);

  // Generate contract code
  let contractCode = generateContractCode();
  let attempts = 0;
  const maxAttempts = 10;

  // Ensure contract code is unique
  while (attempts < maxAttempts) {
    const existing = await Contract.findOne({ contractCode });
    if (!existing) {
      break;
    }
    contractCode = generateContractCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique contract code");
  }

  // Use transaction for atomic creation
  const session = await Contract.startSession();
  session.startTransaction();

  try {
    // Create contract
    const contract = await Contract.create(
      [
        {
          contractCode,
          customerId: new Types.ObjectId(data.customerId),
          warehouseId: new Types.ObjectId(data.warehouseId),
          rentedShelves: data.rentedShelves.map((rs) => ({
            shelfId: new Types.ObjectId(rs.shelfId),
            area: rs.area,
            capacity: rs.capacity,
            startDate: new Date(rs.startDate),
            endDate: new Date(rs.endDate),
            price: rs.price
          })),
          status: "draft",
          createdBy: new Types.ObjectId(createdBy)
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const createdContract = contract[0];

    // Return response DTO
    return {
      contract_id: createdContract._id.toString(),
      contract_code: createdContract.contractCode,
      customer_id: createdContract.customerId.toString(),
      warehouse_id: createdContract.warehouseId.toString(),
      rented_shelves: createdContract.rentedShelves.map((rs) => ({
        shelf_id: rs.shelfId.toString(),
        area: rs.area,
        capacity: rs.capacity,
        start_date: rs.startDate,
        end_date: rs.endDate,
        price: rs.price
      })),
      status: createdContract.status,
      created_by: createdContract.createdBy.toString(),
      created_at: createdContract.createdAt,
      updated_at: createdContract.updatedAt
    };
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Get contracts with role-based filtering
 */
export async function getContracts(
  userId: string,
  userRole: string
): Promise<ContractResponse[]> {
  const query: any = {};

  // Customer can only see their own contracts
  if (userRole === "customer") {
    query.customerId = new Types.ObjectId(userId);
  }
  // Manager and Admin can see all contracts

  const contracts = await Contract.find(query)
    .populate("customerId", "name email")
    .populate("warehouseId", "name address")
    .populate("createdBy", "name email")
    .populate("rentedShelves.shelfId", "shelfCode tierCount width depth maxCapacity")
    .sort({ createdAt: -1 });

  return contracts.map((contract) => ({
    contract_id: contract._id.toString(),
    contract_code: contract.contractCode,
    customer_id: contract.customerId.toString(),
    warehouse_id: contract.warehouseId.toString(),
    rented_shelves: contract.rentedShelves.map((rs) => ({
      shelf_id: rs.shelfId.toString(),
      area: rs.area,
      capacity: rs.capacity,
      start_date: rs.startDate,
      end_date: rs.endDate,
      price: rs.price
    })),
    status: contract.status,
    created_by: contract.createdBy.toString(),
    created_at: contract.createdAt,
    updated_at: contract.updatedAt
  }));
}

/**
 * Get contract by ID
 */
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
    .populate("rentedShelves.shelfId", "shelfCode tierCount width depth maxCapacity");

  if (!contract) {
    throw new Error("Contract not found");
  }

  // Customer can only view their own contracts
  if (userRole === "customer" && contract.customerId.toString() !== userId) {
    throw new Error("Access denied. You can only view your own contracts.");
  }

  return {
    contract_id: contract._id.toString(),
    contract_code: contract.contractCode,
    customer_id: contract.customerId.toString(),
    warehouse_id: contract.warehouseId.toString(),
    rented_shelves: contract.rentedShelves.map((rs) => ({
      shelf_id: rs.shelfId.toString(),
      area: rs.area,
      capacity: rs.capacity,
      start_date: rs.startDate,
      end_date: rs.endDate,
      price: rs.price
    })),
    status: contract.status,
    created_by: contract.createdBy.toString(),
    created_at: contract.createdAt,
    updated_at: contract.updatedAt
  };
}

/**
 * Update contract status
 */
export async function updateContractStatus(
  contractId: string,
  newStatus: "draft" | "active" | "expired" | "terminated",
  userId: string,
  userRole: string
): Promise<ContractResponse> {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract ID");
  }

  // Only manager can update contract status
  if (userRole !== "manager") {
    throw new Error("Only managers can update contract status");
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }

  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    draft: ["active", "terminated"],
    active: ["expired", "terminated"],
    expired: ["terminated"],
    terminated: []
  };

  if (!validTransitions[contract.status].includes(newStatus)) {
    throw new Error(
      `Invalid status transition from ${contract.status} to ${newStatus}`
    );
  }

  // Use transaction for atomic update
  const session = await Contract.startSession();
  session.startTransaction();

  try {
    // Update contract status
    contract.status = newStatus;
    await contract.save({ session });

    // Update shelf status based on contract status
    if (newStatus === "active") {
      // Mark shelves as RENTED
      for (const rentedShelf of contract.rentedShelves) {
        await Shelf.findByIdAndUpdate(
          rentedShelf.shelfId,
          { status: "RENTED" },
          { session }
        );
      }
    } else if (newStatus === "expired" || newStatus === "terminated") {
      // Check if shelf is still rented by other active contracts
      for (const rentedShelf of contract.rentedShelves) {
        const otherActiveContracts = await Contract.countDocuments({
          _id: { $ne: contract._id },
          status: "active",
          "rentedShelves.shelfId": rentedShelf.shelfId
        });

        // Only mark as AVAILABLE if no other active contract uses this shelf
        if (otherActiveContracts === 0) {
          await Shelf.findByIdAndUpdate(
            rentedShelf.shelfId,
            { status: "AVAILABLE" },
            { session }
          );
        }
      }
    }

    await session.commitTransaction();

    // Reload contract with populated fields
    const updatedContract = await Contract.findById(contractId)
      .populate("customerId", "name email")
      .populate("warehouseId", "name address")
      .populate("createdBy", "name email")
      .populate("rentedShelves.shelfId", "shelfCode tierCount width depth maxCapacity");

    return {
      contract_id: updatedContract!._id.toString(),
      contract_code: updatedContract!.contractCode,
      customer_id: updatedContract!.customerId.toString(),
      warehouse_id: updatedContract!.warehouseId.toString(),
      rented_shelves: updatedContract!.rentedShelves.map((rs) => ({
        shelf_id: rs.shelfId.toString(),
        level: rs.level,
        area: rs.area,
        capacity: rs.capacity,
        start_date: rs.startDate,
        end_date: rs.endDate,
        price: rs.price
      })),
      status: updatedContract!.status,
      created_by: updatedContract!.createdBy.toString(),
      created_at: updatedContract!.createdAt,
      updated_at: updatedContract!.updatedAt
    };
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
