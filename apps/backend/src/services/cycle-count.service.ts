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
import { getAllowedStaffIdsForWarehouse } from "./staff-warehouse.service";

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
 * CUSTOMER creates a Cycle Count Request
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

    // Create cycle count request
    const cycleCount = await CycleCount.create(
      [
        {
          contractId: contract._id,
          createdByCustomerId: new Types.ObjectId(customerId),
          status: "PENDING_MANAGER_APPROVAL",
          note: dto.note?.trim(),
          preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
          requestedAt: new Date(),
          targetStoredItemIds
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
      status: "PENDING_MANAGER_APPROVAL",
      note: dto.note?.trim(),
      preferred_date: dto.preferredDate ? new Date(dto.preferredDate) : undefined,
      requested_at: cycleCount[0].requestedAt,
      warehouse_id: contract.warehouseId.toString(),
      warehouse_name: (contractPopulated!.warehouseId as any).name,
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

  if (dto.decision === "REJECTED" && (!dto.rejectionReason || dto.rejectionReason.trim().length === 0)) {
    throw new Error("Rejection reason is required when rejecting");
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

    if (cycleCount.status !== "PENDING_MANAGER_APPROVAL") {
      throw new Error("Only PENDING_MANAGER_APPROVAL cycle counts can be approved/rejected");
    }

    const now = new Date();

    if (dto.decision === "APPROVED") {
      // Sau khi manager approve, request sẵn sàng cho bước assign staff
      cycleCount.status = "ASSIGNED_TO_STAFF";
      cycleCount.approvedAt = now;
      cycleCount.approvedBy = new Types.ObjectId(managerId);
    } else {
      cycleCount.status = "REJECTED";
      cycleCount.rejectedAt = now;
      cycleCount.rejectedBy = new Types.ObjectId(managerId);
      cycleCount.rejectionReason = dto.rejectionReason!.trim();
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
  validateAssignStaffDTO(dto);

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

    if (cycleCount.status !== "ASSIGNED_TO_STAFF") {
      throw new Error("Cycle count must be in ASSIGNED_TO_STAFF status to assign staff");
    }

    // Verify all staff IDs are valid staff users
    const staffUsers = await User.find({
      _id: { $in: dto.staffIds.map((id) => new Types.ObjectId(id)) },
      role: "staff"
    }).session(session);

    if (staffUsers.length !== dto.staffIds.length) {
      throw new Error("One or more staff IDs are invalid or not staff users");
    }

    // Enforce warehouse-scoped staffing (manager assignment must attach staff configured for
    // the cycle count's contract warehouse).
    const contract = await Contract.findById(cycleCount.contractId).select("warehouseId").lean();
    if (!contract) throw new Error("Contract not found");
    const allowed = await getAllowedStaffIdsForWarehouse(contract.warehouseId.toString(), dto.staffIds);
    const missing = dto.staffIds.filter((id) => !allowed.has(id));
    if (missing.length > 0) {
      throw new Error("not allowed: One or more staff members are not permitted to handle tasks for this warehouse");
    }

    // Delete existing assignments
    await CycleCountAssignment.deleteMany(
      { cycleCountId: cycleCount._id },
      { session }
    );

    // Create new assignments
    const assignments = dto.staffIds.map((staffId) => ({
      cycleCountId: cycleCount._id,
      staffId: new Types.ObjectId(staffId),
      assignedBy: new Types.ObjectId(managerId),
      assignedAt: new Date()
    }));

    await CycleCountAssignment.insertMany(assignments, { session });

    // Update cycle count deadline
    cycleCount.countingDeadline = new Date(dto.countingDeadline);
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
    // Sau khi staff submit, chờ customer review: approve hoặc yêu cầu điều chỉnh tồn kho
    cycleCount.status = "STAFF_SUBMITTED";
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
 * CUSTOMER confirms cycle count result
 *
 * Trường hợp này dùng khi:
 * - Kết quả kiểm kê KHÔNG có chênh lệch đáng kể, hoặc
 * - Customer chấp nhận giữ nguyên số lượng hiện tại trên hệ thống.
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

    // Update status
    cycleCount.status = "CONFIRMED";
    cycleCount.confirmedAt = new Date();
    cycleCount.confirmedBy = new Types.ObjectId(userId);
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
 * CUSTOMER yêu cầu điều chỉnh tồn kho theo kết quả kiểm kê
 * (khi phát hiện chênh lệch và muốn cập nhật lại số lượng trên hệ thống).
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
      throw new Error("Cycle count must be in STAFF_SUBMITTED status to request inventory adjustment");
    }

    if (cycleCount.createdByCustomerId.toString() !== customerId) {
      throw new Error("Customer can only request adjustment for their own cycle counts");
    }

    // Ensure there is at least one discrepancy to adjust
    const discrepancyCount = await CycleCountItem.countDocuments({
      cycleCountId: cycleCount._id,
      discrepancy: { $ne: 0 }
    }).session(session);

    if (discrepancyCount === 0) {
      throw new Error("No discrepancies to adjust for this cycle count");
    }

    cycleCount.status = "ADJUSTMENT_REQUESTED";
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

    if (cycleCount.status !== "ADJUSTMENT_REQUESTED") {
      throw new Error("Cycle count must be in ADJUSTMENT_REQUESTED status to apply adjustment");
    }

    // Lấy tất cả items của lần kiểm kê
    const items = await CycleCountItem.find({
      cycleCountId: cycleCount._id
    }).session(session);

    if (items.length === 0) {
      throw new Error("Cycle count has no items to adjust");
    }

    // Cập nhật quantity của StoredItem theo countedQuantity
    for (const item of items) {
      const storedItem = await StoredItem.findById(item.storedItemId).session(session);
      if (!storedItem) {
        throw new Error(`Stored item ${item.storedItemId.toString()} not found`);
      }

      // Đảm bảo cùng contract
      if (storedItem.contractId.toString() !== cycleCount.contractId.toString()) {
        throw new Error(
          `Stored item ${item.storedItemId.toString()} does not belong to this cycle count's contract`
        );
      }

      storedItem.quantity = item.countedQuantity;
      await storedItem.save({ session });
    }

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
    if (cc.status === "STAFF_SUBMITTED" || cc.status === "CONFIRMED") {
      const countItems = await CycleCountItem.find({
        cycleCountId: cc._id
      })
        .populate("shelfId", "shelfCode")
        .populate("storedItemId", "itemName unit")
        .lean();

      items = countItems.map((item) => ({
        item_id: item._id.toString(),
        stored_item_id: item.storedItemId.toString(),
        shelf_id: item.shelfId.toString(),
        shelf_code: (item.shelfId as any).shelfCode,
        item_name: (item.storedItemId as any).itemName,
        unit: (item.storedItemId as any).unit,
        system_quantity: item.systemQuantity,
        counted_quantity: item.countedQuantity,
        discrepancy: item.discrepancy,
        note: item.note
      }));
    }

    results.push({
      cycle_count_id: cc._id.toString(),
      contract_id: (cc.contractId as any)._id?.toString() || cc.contractId.toString(),
      contract_code: (cc.contractId as any).contractCode,
      customer_id: (cc.createdByCustomerId as any)._id?.toString() || cc.createdByCustomerId.toString(),
      customer_name: (cc.createdByCustomerId as any).name,
      status: cc.status,
      note: cc.note,
      preferred_date: cc.preferredDate,
      requested_at: cc.requestedAt,
      approved_at: cc.approvedAt,
      approved_by: cc.approvedBy
        ? {
          user_id: (cc.approvedBy as any)._id?.toString() || cc.approvedBy.toString(),
          name: (cc.approvedBy as any).name,
          email: (cc.approvedBy as any).email
        }
        : undefined,
      rejected_at: cc.rejectedAt,
      rejected_by: cc.rejectedBy
        ? {
          user_id: (cc.rejectedBy as any)._id?.toString() || cc.rejectedBy.toString(),
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
          user_id: (cc.confirmedBy as any)._id?.toString() || cc.confirmedBy.toString(),
          name: (cc.confirmedBy as any).name,
          email: (cc.confirmedBy as any).email
        }
        : undefined,
      assigned_staff: assignments.map((a) => ({
        user_id: (a.staffId as any)._id?.toString() || a.staffId.toString(),
        name: (a.staffId as any).name,
        email: (a.staffId as any).email,
        assigned_at: a.assignedAt
      })),
      items,
      inventory_adjusted: cc.inventoryAdjusted ?? false,
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
    .lean();

  if (!cycleCount) {
    throw new Error("Cycle count not found");
  }

  // Role-based access control
  if (userRole === "customer") {
    if ((cycleCount.createdByCustomerId as any)._id?.toString() !== userId) {
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
  if (cycleCount.status === "STAFF_SUBMITTED" || cycleCount.status === "CONFIRMED") {
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

        stored_item_id: storedItem._id.toString(),
        shelf_id: shelf._id.toString(),

        shelf_code: shelf.shelfCode,
        item_name: storedItem.itemName,
        unit: storedItem.unit,

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
        shelf_id: shelf._id.toString(),
        shelf_code: shelf.shelfCode || "",
        item_name: si.itemName,
        unit: si.unit,
        system_quantity: si.quantity
      };
    });
  }

  return {
    cycle_count_id: cycleCount._id.toString(),
    contract_id: (cycleCount.contractId as any)._id?.toString() || cycleCount.contractId.toString(),
    contract_code: (cycleCount.contractId as any).contractCode,
    customer_id: (cycleCount.createdByCustomerId as any)._id?.toString() || cycleCount.createdByCustomerId.toString(),
    customer_name: (cycleCount.createdByCustomerId as any).name,
    status: cycleCount.status,
    note: cycleCount.note,
    preferred_date: cycleCount.preferredDate,
    requested_at: cycleCount.requestedAt,
    approved_at: cycleCount.approvedAt,
    approved_by: cycleCount.approvedBy
      ? {
        user_id: (cycleCount.approvedBy as any)._id?.toString() || cycleCount.approvedBy.toString(),
        name: (cycleCount.approvedBy as any).name,
        email: (cycleCount.approvedBy as any).email
      }
      : undefined,
    rejected_at: cycleCount.rejectedAt,
    rejected_by: cycleCount.rejectedBy
      ? {
        user_id: (cycleCount.rejectedBy as any)._id?.toString() || cycleCount.rejectedBy.toString(),
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
        user_id: (cycleCount.confirmedBy as any)._id?.toString() || cycleCount.confirmedBy.toString(),
        name: (cycleCount.confirmedBy as any).name,
        email: (cycleCount.confirmedBy as any).email
      }
      : undefined,
    assigned_staff: assignments.map((a) => ({
      user_id: (a.staffId as any)._id?.toString() || a.staffId.toString(),
      name: (a.staffId as any).name,
      email: (a.staffId as any).email,
      assigned_at: a.assignedAt
    })),
    items,
    target_items,
    inventory_adjusted: cycleCount.inventoryAdjusted ?? false,
    warehouse_id: warehouse ? (warehouse as any)._id.toString() : "",
    warehouse_name: warehouse ? (warehouse as any).name : "",
    created_at: cycleCount.createdAt,
    updated_at: cycleCount.updatedAt
  };
}
