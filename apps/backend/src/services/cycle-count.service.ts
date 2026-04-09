import { Types } from "mongoose";
import mongoose from "mongoose";
import CycleCount from "../models/CycleCount";
import CycleCountItem from "../models/CycleCountItem";
import CycleCountAssignment from "../models/CycleCountAssignment";
import Contract from "../models/Contract";
import StoredItem from "../models/StoredItem";
import User from "../models/User";
import Shelf from "../models/Shelf";
import { consumeReservedCreditForEntity } from "./request-credit.service";
import StaffWarehouse from "../models/StaffWarehouse";

/**
 * DTOs for Cycle Count
 */

export interface CreateCycleCountDTO {
  contractId: string;
  /**
   * Danh sách stored item cần kiểm kê.
   * Nếu bỏ trống hoặc không gửi, sẽ kiểm kê TẤT CẢ stored items trong contract.
   */
  storedItemIds?: string[];
  note?: string;
  preferredDate?: Date;
}

export interface ApproveCycleCountDTO {
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface AssignStaffDTO {
  staffIds: string[];
  countingDeadline: Date;
}

export interface CycleCountItemDTO {
  storedItemId: string;
  shelfId: string;
  countedQuantity: number;
  note?: string;
}

export interface SubmitCycleCountResultDTO {
  items: CycleCountItemDTO[];
}

/**
 * CUSTOMER yêu cầu cập nhật tồn kho theo kết quả kiểm kê
 * (khi phát hiện chênh lệch và muốn sync lại hệ thống).
 */
export interface RequestInventoryAdjustmentDTO {
  // Ghi chú tùy chọn cho yêu cầu điều chỉnh
  reason?: string;
}

export interface CycleCountResponse {
  cycle_count_id: string;
  contract_id: string;
  contract_code: string;
  customer_id: string;
  customer_name: string;
  status: string;
  note?: string;
  preferred_date?: Date;
  requested_at: Date;
  approved_at?: Date;
  approved_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  rejected_at?: Date;
  rejected_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  rejection_reason?: string;
  counting_deadline?: Date;
  completed_at?: Date;
  confirmed_at?: Date;
  confirmed_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  // Đã cập nhật tồn kho theo kết quả kiểm kê hay chưa
  inventory_adjusted?: boolean;
  recount_round?: number;
  recount_requested_at?: Date;
  recount_requested_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  recount_decision_at?: Date;
  recount_decision_by?: {
    user_id: string;
    name: string;
    email: string;
  };
  recount_rejected_reason?: string;
  assigned_staff?: Array<{
    user_id: string;
    name: string;
    email: string;
    assigned_at: Date;
  }>;
  items?: Array<{
    item_id: string;
    stored_item_id: string;
    shelf_id: string;
    shelf_code: string;
    item_name: string;
    unit: string;
    system_quantity: number;
    counted_quantity: number;
    discrepancy: number;
    note?: string;
  }>;
  warehouse_id: string;
  warehouse_name: string;
  created_at: Date;
  updated_at: Date;
  /** For staff when status is ASSIGNED_TO_STAFF: list of items to count with system quantity */
  target_items?: Array<{
    stored_item_id: string;
    shelf_id: string;
    shelf_code: string;
    item_name: string;
    unit: string;
    system_quantity: number;
  }>;
}

async function applyInventoryFromCycleCountItems(
  cycleCountId: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  const items = await CycleCountItem.find({ cycleCountId }).session(session);
  if (items.length === 0) {
    throw new Error("Cycle count has no items to adjust");
  }
  for (const item of items) {
    const storedItem = await StoredItem.findById(item.storedItemId).session(session);
    if (!storedItem) {
      throw new Error(`Stored item ${item.storedItemId.toString()} not found`);
    }
    storedItem.quantity = item.countedQuantity;
    await storedItem.save({ session });
  }
}

/**
 * Validate create cycle count DTO
 */
function validateCreateCycleCountDTO(data: CreateCycleCountDTO): void {
  if (!data.contractId || data.contractId.trim().length === 0) {
    throw new Error("Contract ID is required");
  }

  if (!Types.ObjectId.isValid(data.contractId)) {
    throw new Error("Invalid contract ID");
  }

  if (data.storedItemIds && Array.isArray(data.storedItemIds)) {
    data.storedItemIds.forEach((storedItemId, index) => {
      if (!Types.ObjectId.isValid(storedItemId)) {
        throw new Error(`Invalid stored item ID at index ${index}`);
      }
    });
  }

  if (data.preferredDate && new Date(data.preferredDate) < new Date()) {
    throw new Error("Preferred date cannot be in the past");
  }
}

/**
 * Validate assign staff DTO
 */
function validateAssignStaffDTO(data: AssignStaffDTO): void {
  if (!data.staffIds || !Array.isArray(data.staffIds) || data.staffIds.length === 0) {
    throw new Error("At least one staff member must be assigned");
  }

  data.staffIds.forEach((staffId, index) => {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new Error(`Invalid staff ID at index ${index}`);
    }
  });

  if (!data.countingDeadline) {
    throw new Error("Counting deadline is required");
  }

  if (new Date(data.countingDeadline) < new Date()) {
    throw new Error("Counting deadline cannot be in the past");
  }
}

/**
 * Validate submit result DTO
 */
function validateSubmitResultDTO(data: SubmitCycleCountResultDTO): void {
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Items array is required and must not be empty");
  }

  data.items.forEach((item, index) => {
    if (!Types.ObjectId.isValid(item.storedItemId)) {
      throw new Error(`Invalid stored item ID at index ${index}`);
    }
    if (!Types.ObjectId.isValid(item.shelfId)) {
      throw new Error(`Invalid shelf ID at index ${index}`);
    }
    if (typeof item.countedQuantity !== "number" || item.countedQuantity < 0) {
      throw new Error(`Counted quantity must be a non-negative number at index ${index}`);
    }
  });
}

/**
 * CUSTOMER creates a Cycle Count Request (auto-assigned to warehouse staff)
 */
export async function createCycleCount(
  dto: CreateCycleCountDTO,
  customerId: string
): Promise<CycleCountResponse> {
  validateCreateCycleCountDTO(dto);

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify contract exists and belongs to customer
    const contract = await Contract.findById(dto.contractId).session(session);
    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.customerId.toString() !== customerId) {
      throw new Error("Contract does not belong to the authenticated customer");
    }

    if (contract.status !== "active") {
      throw new Error("Only active contracts can have cycle count requests");
    }

    // Determine which stored items to count
    let targetStoredItemIds: Types.ObjectId[] = [];

    if (dto.storedItemIds && dto.storedItemIds.length > 0) {
      // Validate that all requested stored items belong to the contract
      const requestedStoredItemIds = dto.storedItemIds.map((id) => new Types.ObjectId(id));

      const storedItems = await StoredItem.find({
        _id: { $in: requestedStoredItemIds },
        contractId: contract._id
      }).session(session);

      if (storedItems.length !== requestedStoredItemIds.length) {
        throw new Error(
          "One or more stored items are invalid or do not belong to this contract"
        );
      }

      targetStoredItemIds = requestedStoredItemIds;
    } else {
      // If not provided, count ALL stored items in this contract
      const allStoredItems = await StoredItem.find({
        contractId: contract._id
      }).session(session);

      if (allStoredItems.length === 0) {
        throw new Error("Contract has no stored items to count");
      }

      targetStoredItemIds = allStoredItems.map((si) => si._id);
    }

    const warehouseStaffMapping = await StaffWarehouse.findOne({
      warehouseId: contract.warehouseId
    }).session(session);
    if (!warehouseStaffMapping?.staffId) {
      throw new Error("No staff is assigned to this warehouse yet");
    }
    const assignedStaff = await User.findOne({
      _id: warehouseStaffMapping.staffId,
      role: "staff",
      isActive: true
    }).session(session);
    if (!assignedStaff) {
      throw new Error("Assigned warehouse staff is inactive or invalid");
    }

    const now = new Date();
    // If customer set preferred date, use end-of-day for deadline, otherwise 24h from now.
    const deadline = dto.preferredDate
      ? new Date(new Date(dto.preferredDate).setHours(23, 59, 59, 999))
      : new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create cycle count request
    const cycleCount = await CycleCount.create(
      [
        {
          contractId: contract._id,
          createdByCustomerId: new Types.ObjectId(customerId),
          status: "ASSIGNED_TO_STAFF",
          note: dto.note?.trim(),
          preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
          requestedAt: now,
          approvedAt: now,
          approvedBy: new Types.ObjectId(customerId),
          countingDeadline: deadline,
          targetStoredItemIds
        }
      ],
      { session }
    );

    await CycleCountAssignment.create(
      [
        {
          cycleCountId: cycleCount[0]._id,
          staffId: assignedStaff._id,
          assignedBy: new Types.ObjectId(customerId),
          assignedAt: now
        }
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate and return response
    const populatedCycleCount = await CycleCount.findById(cycleCount[0]._id)
      .populate("contractId", "contractCode warehouseId")
      .populate("createdByCustomerId", "name email")
      .populate("contractId")
      .lean();

    const contractPopulated = await Contract.findById(dto.contractId)
      .populate("warehouseId", "name")
      .lean();

    return {
      cycle_count_id: cycleCount[0]._id.toString(),
      contract_id: contract._id.toString(),
      contract_code: contract.contractCode,
      customer_id: customerId,
      customer_name: (populatedCycleCount!.createdByCustomerId as any).name,
      status: "ASSIGNED_TO_STAFF",
      note: dto.note?.trim(),
      preferred_date: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
      requested_at: cycleCount[0].requestedAt,
      warehouse_id: contract.warehouseId.toString(),
      warehouse_name: (contractPopulated!.warehouseId as any).name,
      counting_deadline: cycleCount[0].countingDeadline,
      assigned_staff: [
        {
          user_id: assignedStaff._id.toString(),
          name: assignedStaff.name,
          email: assignedStaff.email,
          assigned_at: now
        }
      ],
      created_at: cycleCount[0].createdAt,
      updated_at: cycleCount[0].updatedAt,
      inventory_adjusted: false
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * MANAGER approves or rejects Cycle Count Request
 */
export async function approveOrRejectCycleCount(
  cycleCountId: string,
  managerId: string,
  dto: ApproveCycleCountDTO
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }
  if (!Types.ObjectId.isValid(managerId)) {
    throw new Error("Invalid manager ID");
  }
  if (dto.decision !== "APPROVED" && dto.decision !== "REJECTED") {
    throw new Error("Decision must be either APPROVED or REJECTED");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const manager = await User.findById(managerId).session(session);
    if (!manager || manager.role !== "manager") {
      throw new Error("Manager not found");
    }

    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) throw new Error("Cycle count not found");
    if (cycleCount.status !== "RECOUNT_REQUIRED") {
      throw new Error("Only RECOUNT_REQUIRED cycle counts can be approved/rejected by manager");
    }

    const now = new Date();
    cycleCount.recountDecisionAt = now;
    cycleCount.recountDecisionBy = new Types.ObjectId(managerId);

    if (dto.decision === "APPROVED") {
      cycleCount.status = "ASSIGNED_TO_STAFF";
      cycleCount.recountRound = (cycleCount.recountRound || 0) + 1;
      cycleCount.countingDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await CycleCountItem.deleteMany({ cycleCountId: cycleCount._id }, { session });
    } else {
      cycleCount.status = "STAFF_SUBMITTED";
      cycleCount.recountRejectedReason = dto.rejectionReason?.trim() || "Recount request rejected by manager";
    }

    await cycleCount.save({ session });
    await session.commitTransaction();
    return await getCycleCountById(cycleCountId, managerId, "manager");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * MANAGER assigns staff to Cycle Count
 */
export async function assignStaffToCycleCount(
  cycleCountId: string,
  managerId: string,
  dto: AssignStaffDTO
): Promise<CycleCountResponse> {
  void cycleCountId;
  void managerId;
  void dto;
  throw new Error("Manual assignment is disabled. Cycle count requests are auto-assigned by warehouse staff mapping.");
}

/**
 * STAFF submits cycle count results
 */
export async function submitCycleCountResult(
  cycleCountId: string,
  staffId: string,
  dto: SubmitCycleCountResultDTO
): Promise<CycleCountResponse> {
  validateSubmitResultDTO(dto);

  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(staffId)) {
    throw new Error("Invalid staff ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify staff is assigned to this cycle count
    const assignment = await CycleCountAssignment.findOne({
      cycleCountId: new Types.ObjectId(cycleCountId),
      staffId: new Types.ObjectId(staffId)
    }).session(session);

    if (!assignment) {
      throw new Error("Staff member is not assigned to this cycle count");
    }

    // Get cycle count
    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) {
      throw new Error("Cycle count not found");
    }

    if (cycleCount.status !== "ASSIGNED_TO_STAFF") {
      throw new Error("Cycle count must be in ASSIGNED_TO_STAFF status to submit results");
    }

    // Get contract and shelves
    const contract = await Contract.findById(cycleCount.contractId).session(session);
    if (!contract) {
      throw new Error("Contract not found");
    }

    // In SIMS-V1, contract rents zones (rentedZones), not shelves directly.
    // Shelves belong to those zones. Build list of shelfIds that belong to this contract.
    const rentedZoneIds = contract.rentedZones.map((rz) => rz.zoneId);

    const shelvesForContract = await Shelf.find({
      zoneId: { $in: rentedZoneIds }
    })
      .select("_id")
      .session(session);

    const contractShelfIds = shelvesForContract.map((shelf) => shelf._id.toString());

    // Validate and create cycle count items
    const cycleCountItems: any[] = [];

    for (const itemDto of dto.items) {
      // If request có giới hạn danh sách stored items, đảm bảo staff chỉ submit trong danh sách đó
      if (
        Array.isArray((cycleCount as any).targetStoredItemIds) &&
        (cycleCount as any).targetStoredItemIds.length > 0
      ) {
        const allowed = (cycleCount as any).targetStoredItemIds.some(
          (id: Types.ObjectId) => id.toString() === itemDto.storedItemId
        );
        if (!allowed) {
          throw new Error(
            `Stored item ${itemDto.storedItemId} is not part of this cycle count request`
          );
        }
      }

      // Verify shelf belongs to contract
      if (!contractShelfIds.includes(itemDto.shelfId)) {
        throw new Error(`Shelf ${itemDto.shelfId} does not belong to this contract`);
      }

      // Find corresponding stored item
      const storedItem = await StoredItem.findById(itemDto.storedItemId).session(session);
      if (!storedItem) {
        throw new Error(`Stored item ${itemDto.storedItemId} not found`);
      }

      if (storedItem.contractId.toString() !== cycleCount.contractId.toString()) {
        throw new Error(`Stored item ${itemDto.storedItemId} does not belong to this contract`);
      }

      if (storedItem.shelfId.toString() !== itemDto.shelfId) {
        throw new Error(`Stored item ${itemDto.storedItemId} is not on shelf ${itemDto.shelfId}`);
      }

      // Calculate discrepancy: countedQuantity - systemQuantity
      const discrepancy = itemDto.countedQuantity - storedItem.quantity;

      cycleCountItems.push({
        cycleCountId: cycleCount._id,
        shelfId: new Types.ObjectId(itemDto.shelfId),
        storedItemId: storedItem._id,
        systemQuantity: storedItem.quantity,
        countedQuantity: itemDto.countedQuantity,
        discrepancy: discrepancy,
        note: itemDto.note?.trim()
      });
    }

    // Delete existing items (in case of resubmission)
    await CycleCountItem.deleteMany({ cycleCountId: cycleCount._id }, { session });

    // Create new cycle count items
    await CycleCountItem.insertMany(cycleCountItems, { session });

    // Update cycle count status:
    // - Round đầu: chờ customer confirm hoặc request recount.
    // - Recount round: auto apply inventory and close.
    const isRecountRound = (cycleCount.recountRound || 0) > 0;
    if (isRecountRound) {
      await applyInventoryFromCycleCountItems(cycleCount._id, session);
      cycleCount.status = "CONFIRMED";
      cycleCount.inventoryAdjusted = true;
      cycleCount.confirmedAt = new Date();
      cycleCount.confirmedBy = new Types.ObjectId(staffId);
    } else {
      cycleCount.status = "STAFF_SUBMITTED";
    }
    const completedAt = new Date();
    cycleCount.completedAt = completedAt;
    await cycleCount.save({ session });

    // Consume one reserved request credit (if any) when staff submits results.
    await consumeReservedCreditForEntity({
      customerId: cycleCount.createdByCustomerId.toString(),
      contractId: cycleCount.contractId.toString(),
      entityType: "CYCLE",
      entityId: cycleCount._id.toString(),
      now: completedAt,
      session
    });

    await session.commitTransaction();

    return await getCycleCountById(cycleCountId, staffId, "staff");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * CUSTOMER confirms first-round cycle count result.
 * This action updates inventory quantities immediately from counted results.
 */
export async function confirmCycleCount(
  cycleCountId: string,
  userId: string,
  userRole: string
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  // Theo flow mới, chỉ customer mới là người duyệt kết quả cuối cùng
  if (userRole !== "customer") {
    throw new Error("Only customer can confirm cycle count");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get cycle count
    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) {
      throw new Error("Cycle count not found");
    }

    if (cycleCount.status !== "STAFF_SUBMITTED") {
      throw new Error("Cycle count must be in STAFF_SUBMITTED status to confirm");
    }

    // Verify customer owns this cycle count
    if (cycleCount.createdByCustomerId.toString() !== userId) {
      throw new Error("Customer can only confirm their own cycle counts");
    }

    // Apply inventory update from submitted items
    await applyInventoryFromCycleCountItems(cycleCount._id, session);

    // Update status
    cycleCount.status = "CONFIRMED";
    cycleCount.confirmedAt = new Date();
    cycleCount.confirmedBy = new Types.ObjectId(userId);
    cycleCount.inventoryAdjusted = true;
    await cycleCount.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  return await getCycleCountById(cycleCountId, userId, userRole);
}

/**
 * CUSTOMER requests a recount after first-round submission.
 */
export async function requestInventoryAdjustment(
  cycleCountId: string,
  customerId: string,
  dto: RequestInventoryAdjustmentDTO = {}
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) {
      throw new Error("Cycle count not found");
    }

    if (cycleCount.status !== "STAFF_SUBMITTED") {
      throw new Error("Cycle count must be in STAFF_SUBMITTED status to request recount");
    }

    if (cycleCount.createdByCustomerId.toString() !== customerId) {
      throw new Error("Customer can only request adjustment for their own cycle counts");
    }

    cycleCount.status = "RECOUNT_REQUIRED";
    cycleCount.recountRequestedAt = new Date();
    cycleCount.recountRequestedBy = new Types.ObjectId(customerId);
    cycleCount.note = [cycleCount.note, dto.reason?.trim()].filter(Boolean).join(" | ");
    await cycleCount.save({ session });

    await session.commitTransaction();

    return await getCycleCountById(cycleCountId, customerId, "customer");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * MANAGER cập nhật tồn kho dựa trên kết quả kiểm kê
 * - Cập nhật quantity của StoredItem = countedQuantity
 * - Đánh dấu cycle count đã điều chỉnh và kết thúc (CONFIRMED).
 */
export async function applyCycleCountAdjustment(
  cycleCountId: string,
  managerId: string
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(managerId)) {
    throw new Error("Invalid manager ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify manager exists
    const manager = await User.findById(managerId).session(session);
    if (!manager || manager.role !== "manager") {
      throw new Error("Manager not found");
    }

    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) {
      throw new Error("Cycle count not found");
    }

    if (cycleCount.status !== "ADJUSTMENT_REQUESTED" && cycleCount.status !== "STAFF_SUBMITTED") {
      throw new Error("Cycle count must be in ADJUSTMENT_REQUESTED or STAFF_SUBMITTED status to apply adjustment");
    }

    await applyInventoryFromCycleCountItems(cycleCount._id, session);

    // Đánh dấu cycle count đã điều chỉnh và kết thúc
    const now = new Date();
    cycleCount.status = "CONFIRMED";
    cycleCount.confirmedAt = now;
    cycleCount.confirmedBy = new Types.ObjectId(managerId);
    cycleCount.inventoryAdjusted = true;
    await cycleCount.save({ session });

    await session.commitTransaction();

    return await getCycleCountById(cycleCountId, managerId, "manager");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * MANAGER requests recount
 */
export async function requestRecount(
  cycleCountId: string,
  managerId: string
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(managerId)) {
    throw new Error("Invalid manager ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify manager exists
    const manager = await User.findById(managerId).session(session);
    if (!manager || manager.role !== "manager") {
      throw new Error("Manager not found");
    }

    // Get cycle count
    const cycleCount = await CycleCount.findById(cycleCountId).session(session);
    if (!cycleCount) {
      throw new Error("Cycle count not found");
    }

    if (cycleCount.status !== "STAFF_SUBMITTED") {
      throw new Error("Cycle count must be in STAFF_SUBMITTED status to request recount");
    }

    // Reset to ASSIGNED_TO_STAFF status
    cycleCount.status = "ASSIGNED_TO_STAFF";
    cycleCount.completedAt = undefined;
    await cycleCount.save({ session });

    // Delete existing count items (staff will recount)
    await CycleCountItem.deleteMany({ cycleCountId: cycleCount._id }, { session });

    await session.commitTransaction();

    return await getCycleCountById(cycleCountId, managerId, "manager");
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Get cycle counts with role-based filtering
 */
export async function getCycleCounts(
  userId: string,
  userRole: string
): Promise<CycleCountResponse[]> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const query: any = {};

  // Role-based filtering
  if (userRole === "customer") {
    query.createdByCustomerId = new Types.ObjectId(userId);
  } else if (userRole === "staff") {
    // Staff can only see assigned cycle counts
    const assignments = await CycleCountAssignment.find({
      staffId: new Types.ObjectId(userId)
    });
    const cycleCountIds = assignments.map((a) => a.cycleCountId);
    query._id = { $in: cycleCountIds };
  }
  // Manager and Admin can see all cycle counts (no filter)

  const cycleCounts = await CycleCount.find(query)
    .populate("contractId", "contractCode warehouseId")
    .populate("createdByCustomerId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("confirmedBy", "name email")
    .populate("recountRequestedBy", "name email")
    .populate("recountDecisionBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const results: CycleCountResponse[] = [];

  for (const cc of cycleCounts) {
    // Get warehouse info
    const contract = await Contract.findById(cc.contractId).lean();
    const warehouse = contract
      ? await mongoose.model("Warehouse").findById((contract as any).warehouseId).lean()
      : null;

    // Get assigned staff
    const assignments = await CycleCountAssignment.find({
      cycleCountId: cc._id
    })
      .populate("staffId", "name email")
      .lean();

    // Get items if status is STAFF_SUBMITTED or CONFIRMED
    let items: any[] = [];
    if (cc.status === "STAFF_SUBMITTED" || cc.status === "CONFIRMED" || cc.status === "RECOUNT_REQUIRED") {
      const countItems = await CycleCountItem.find({
        cycleCountId: cc._id
      })
        .populate("shelfId", "shelfCode")
        .populate("storedItemId", "itemName unit")
        .lean();

      items = countItems.map((item: any) => {
        const storedItem =
          typeof item.storedItemId === "object"
            ? item.storedItemId
            : { _id: item.storedItemId };
        const shelf =
          typeof item.shelfId === "object"
            ? item.shelfId
            : { _id: item.shelfId };
        return {
          item_id: item._id.toString(),
          stored_item_id: storedItem?._id?.toString?.() || "",
          shelf_id: shelf?._id?.toString?.() || "",
          shelf_code: shelf?.shelfCode,
          item_name: storedItem?.itemName,
          unit: storedItem?.unit,
          system_quantity: item.systemQuantity,
          counted_quantity: item.countedQuantity,
          discrepancy: item.discrepancy,
          note: item.note
        };
      });
    }

    results.push({
      cycle_count_id: cc._id.toString(),
      contract_id:
        (cc.contractId as any)?._id?.toString?.() ||
        (typeof cc.contractId === "object" && (cc.contractId as any)?.toString
          ? (cc.contractId as any).toString()
          : ""),
      contract_code: (cc.contractId as any)?.contractCode || "",
      customer_id:
        (cc.createdByCustomerId as any)?._id?.toString?.() ||
        (typeof cc.createdByCustomerId === "object" && (cc.createdByCustomerId as any)?.toString
          ? (cc.createdByCustomerId as any).toString()
          : ""),
      customer_name: (cc.createdByCustomerId as any)?.name || "",
      status: cc.status,
      note: cc.note,
      preferred_date: cc.preferredDate,
      requested_at: cc.requestedAt,
      approved_at: cc.approvedAt,
      approved_by: cc.approvedBy
        ? {
          user_id:
            (cc.approvedBy as any)?._id?.toString?.() ||
            (cc.approvedBy as any)?.toString?.() ||
            "",
          name: (cc.approvedBy as any).name,
          email: (cc.approvedBy as any).email
        }
        : undefined,
      rejected_at: cc.rejectedAt,
      rejected_by: cc.rejectedBy
        ? {
          user_id:
            (cc.rejectedBy as any)?._id?.toString?.() ||
            (cc.rejectedBy as any)?.toString?.() ||
            "",
          name: (cc.rejectedBy as any).name,
          email: (cc.rejectedBy as any).email
        }
        : undefined,
      rejection_reason: cc.rejectionReason,
      counting_deadline: cc.countingDeadline,
      completed_at: cc.completedAt,
      confirmed_at: cc.confirmedAt,
      confirmed_by: cc.confirmedBy
        ? {
          user_id:
            (cc.confirmedBy as any)?._id?.toString?.() ||
            (cc.confirmedBy as any)?.toString?.() ||
            "",
          name: (cc.confirmedBy as any).name,
          email: (cc.confirmedBy as any).email
        }
        : undefined,
      assigned_staff: assignments.map((a) => ({
        user_id: (a.staffId as any)?._id?.toString?.() || (a.staffId as any)?.toString?.() || "",
        name: (a.staffId as any).name,
        email: (a.staffId as any).email,
        assigned_at: a.assignedAt
      })),
      items,
      inventory_adjusted: cc.inventoryAdjusted ?? false,
      recount_round: cc.recountRound ?? 0,
      recount_requested_at: cc.recountRequestedAt,
      recount_requested_by: cc.recountRequestedBy
        ? {
          user_id:
            (cc.recountRequestedBy as any)?._id?.toString?.() ||
            (cc.recountRequestedBy as any)?.toString?.() ||
            "",
          name: (cc.recountRequestedBy as any).name,
          email: (cc.recountRequestedBy as any).email
        }
        : undefined,
      recount_decision_at: cc.recountDecisionAt,
      recount_decision_by: cc.recountDecisionBy
        ? {
          user_id:
            (cc.recountDecisionBy as any)?._id?.toString?.() ||
            (cc.recountDecisionBy as any)?.toString?.() ||
            "",
          name: (cc.recountDecisionBy as any).name,
          email: (cc.recountDecisionBy as any).email
        }
        : undefined,
      recount_rejected_reason: cc.recountRejectedReason,
      warehouse_id: warehouse ? (warehouse as any)._id.toString() : "",
      warehouse_name: warehouse ? (warehouse as any).name : "",
      created_at: cc.createdAt,
      updated_at: cc.updatedAt
    });
  }

  return results;
}

/**
 * Get cycle count by ID with role-based access control
 */
export async function getCycleCountById(
  cycleCountId: string,
  userId: string,
  userRole: string
): Promise<CycleCountResponse> {
  if (!Types.ObjectId.isValid(cycleCountId)) {
    throw new Error("Invalid cycle count ID");
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const cycleCount = await CycleCount.findById(cycleCountId)
    .populate("contractId", "contractCode warehouseId")
    .populate("createdByCustomerId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("confirmedBy", "name email")
    .populate("recountRequestedBy", "name email")
    .populate("recountDecisionBy", "name email")
    .lean();

  if (!cycleCount) {
    throw new Error("Cycle count not found");
  }

  // Role-based access control
  if (userRole === "customer") {
    const cycleCustomerId =
      (cycleCount.createdByCustomerId as any)?._id?.toString?.() ||
      (cycleCount.createdByCustomerId as any)?.toString?.() ||
      "";
    if (cycleCustomerId !== userId) {
      throw new Error("Customer can only view their own cycle counts");
    }
  } else if (userRole === "staff") {
    const assignment = await CycleCountAssignment.findOne({
      cycleCountId: cycleCount._id,
      staffId: new Types.ObjectId(userId)
    });
    if (!assignment) {
      throw new Error("Staff member is not assigned to this cycle count");
    }
  }
  // Manager and Admin can view all

  // Get warehouse info
  const contract = await Contract.findById(cycleCount.contractId).lean();
  const warehouse = contract
    ? await mongoose.model("Warehouse").findById((contract as any).warehouseId).lean()
    : null;

  // Get assigned staff
  const assignments = await CycleCountAssignment.find({
    cycleCountId: cycleCount._id
  })
    .populate("staffId", "name email")
    .lean();

  // Get items if status is STAFF_SUBMITTED or CONFIRMED
  let items: any[] = [];
  if (
    cycleCount.status === "STAFF_SUBMITTED" ||
    cycleCount.status === "CONFIRMED" ||
    cycleCount.status === "RECOUNT_REQUIRED"
  ) {
    const countItems = await CycleCountItem.find({
      cycleCountId: cycleCount._id
    })
      .populate("shelfId", "shelfCode")
      .populate("storedItemId", "itemName unit")
      .lean();

    items = countItems.map((item: any) => {
      const storedItem =
        typeof item.storedItemId === "object"
          ? item.storedItemId
          : { _id: item.storedItemId };

      const shelf =
        typeof item.shelfId === "object"
          ? item.shelfId
          : { _id: item.shelfId };

      return {
        item_id: item._id.toString(),
        stored_item_id: storedItem?._id?.toString?.() || "",
        shelf_id: shelf?._id?.toString?.() || "",
        shelf_code: shelf?.shelfCode || "",
        item_name: storedItem?.itemName || "(deleted item)",
        unit: storedItem?.unit || "",

        system_quantity: item.systemQuantity,
        counted_quantity: item.countedQuantity,
        discrepancy: item.discrepancy,
        note: item.note
      };
    });
  }

  // For staff when status is ASSIGNED_TO_STAFF: return target items to count (stored items + shelf + system qty)
  let target_items: CycleCountResponse["target_items"];
  if (
    userRole === "staff" &&
    cycleCount.status === "ASSIGNED_TO_STAFF"
  ) {
    const targetIds =
      Array.isArray((cycleCount as any).targetStoredItemIds) &&
      (cycleCount as any).targetStoredItemIds.length > 0
        ? (cycleCount as any).targetStoredItemIds
        : null;

    const storedItemsQuery = targetIds
      ? StoredItem.find({ _id: { $in: targetIds }, contractId: cycleCount.contractId })
      : StoredItem.find({ contractId: cycleCount.contractId });

    const storedItems = await storedItemsQuery
      .populate("shelfId", "shelfCode")
      .lean();

    target_items = storedItems.map((si: any) => {
      const shelf = typeof si.shelfId === "object" ? si.shelfId : { _id: si.shelfId, shelfCode: "" };
      return {
        stored_item_id: si._id.toString(),
        shelf_id: shelf?._id?.toString?.() || "",
        shelf_code: shelf?.shelfCode || "",
        item_name: si.itemName,
        unit: si.unit,
        system_quantity: si.quantity
      };
    });
  }

  return {
    cycle_count_id: cycleCount._id.toString(),
    contract_id:
      (cycleCount.contractId as any)?._id?.toString?.() ||
      (typeof cycleCount.contractId === "object" && (cycleCount.contractId as any)?.toString
        ? (cycleCount.contractId as any).toString()
        : ""),
    contract_code: (cycleCount.contractId as any)?.contractCode || "",
    customer_id:
      (cycleCount.createdByCustomerId as any)?._id?.toString?.() ||
      (typeof cycleCount.createdByCustomerId === "object" &&
      (cycleCount.createdByCustomerId as any)?.toString
        ? (cycleCount.createdByCustomerId as any).toString()
        : ""),
    customer_name: (cycleCount.createdByCustomerId as any)?.name || "",
    status: cycleCount.status,
    note: cycleCount.note,
    preferred_date: cycleCount.preferredDate,
    requested_at: cycleCount.requestedAt,
    approved_at: cycleCount.approvedAt,
    approved_by: cycleCount.approvedBy
      ? {
        user_id:
          (cycleCount.approvedBy as any)?._id?.toString?.() ||
          (cycleCount.approvedBy as any)?.toString?.() ||
          "",
        name: (cycleCount.approvedBy as any).name,
        email: (cycleCount.approvedBy as any).email
      }
      : undefined,
    rejected_at: cycleCount.rejectedAt,
    rejected_by: cycleCount.rejectedBy
      ? {
        user_id:
          (cycleCount.rejectedBy as any)?._id?.toString?.() ||
          (cycleCount.rejectedBy as any)?.toString?.() ||
          "",
        name: (cycleCount.rejectedBy as any).name,
        email: (cycleCount.rejectedBy as any).email
      }
      : undefined,
    rejection_reason: cycleCount.rejectionReason,
    counting_deadline: cycleCount.countingDeadline,
    completed_at: cycleCount.completedAt,
    confirmed_at: cycleCount.confirmedAt,
    confirmed_by: cycleCount.confirmedBy
      ? {
        user_id:
          (cycleCount.confirmedBy as any)?._id?.toString?.() ||
          (cycleCount.confirmedBy as any)?.toString?.() ||
          "",
        name: (cycleCount.confirmedBy as any).name,
        email: (cycleCount.confirmedBy as any).email
      }
      : undefined,
    assigned_staff: assignments.map((a) => ({
      user_id: (a.staffId as any)?._id?.toString?.() || (a.staffId as any)?.toString?.() || "",
      name: (a.staffId as any).name,
      email: (a.staffId as any).email,
      assigned_at: a.assignedAt
    })),
    items,
    target_items,
    inventory_adjusted: cycleCount.inventoryAdjusted ?? false,
    recount_round: (cycleCount as any).recountRound ?? 0,
    recount_requested_at: (cycleCount as any).recountRequestedAt,
    recount_requested_by: (cycleCount as any).recountRequestedBy
      ? {
        user_id:
          (cycleCount as any).recountRequestedBy?._id?.toString?.() ||
          (cycleCount as any).recountRequestedBy?.toString?.() ||
          "",
        name: (cycleCount as any).recountRequestedBy.name,
        email: (cycleCount as any).recountRequestedBy.email
      }
      : undefined,
    recount_decision_at: (cycleCount as any).recountDecisionAt,
    recount_decision_by: (cycleCount as any).recountDecisionBy
      ? {
        user_id:
          (cycleCount as any).recountDecisionBy?._id?.toString?.() ||
          (cycleCount as any).recountDecisionBy?.toString?.() ||
          "",
        name: (cycleCount as any).recountDecisionBy.name,
        email: (cycleCount as any).recountDecisionBy.email
      }
      : undefined,
    recount_rejected_reason: (cycleCount as any).recountRejectedReason,
    warehouse_id: warehouse ? (warehouse as any)._id.toString() : "",
    warehouse_name: warehouse ? (warehouse as any).name : "",
    created_at: cycleCount.createdAt,
    updated_at: cycleCount.updatedAt
  };
}
