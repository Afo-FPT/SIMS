import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Cycle Count Status Flow:
 * PENDING_MANAGER_APPROVAL → ASSIGNED_TO_STAFF → STAFF_SUBMITTED
 *                                                     ↓
 *                                        ADJUSTMENT_REQUESTED (optional)
 *                                                     ↓
 *                                                CONFIRMED (done)
 *                                                     ↓
 *                                           RECOUNT_REQUIRED → ASSIGNED_TO_STAFF (loop)
 */
export type CycleCountStatus =
  | "PENDING_MANAGER_APPROVAL"
  | "ASSIGNED_TO_STAFF"
  | "STAFF_SUBMITTED"
  | "CONFIRMED"
  | "ADJUSTMENT_REQUESTED"
  | "RECOUNT_REQUIRED"
  | "REJECTED";

export interface ICycleCount extends Document {
  contractId: Types.ObjectId;
  createdByCustomerId: Types.ObjectId;
  status: CycleCountStatus;
  note?: string;
  preferredDate?: Date;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  countingDeadline?: Date;
  completedAt?: Date;
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId;
  /**
   * Danh sách stored items mà customer yêu cầu kiểm kê.
   * Nếu không có, hiểu là kiểm kê toàn bộ stored items của contract.
   */
  targetStoredItemIds?: Types.ObjectId[];
  /**
   * True if manager has already updated inventory quantities
   * according to this cycle count's discrepancies.
   */
  inventoryAdjusted?: boolean;
  recountRound?: number;
  recountRequestedAt?: Date;
  recountRequestedBy?: Types.ObjectId;
  recountDecisionAt?: Date;
  recountDecisionBy?: Types.ObjectId;
  recountRejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CycleCountSchema = new Schema<ICycleCount>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    createdByCustomerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: [
        "PENDING_MANAGER_APPROVAL",
        "ASSIGNED_TO_STAFF",
        "STAFF_SUBMITTED",
        "CONFIRMED",
        "ADJUSTMENT_REQUESTED",
        "RECOUNT_REQUIRED",
        "REJECTED"
      ],
      default: "PENDING_MANAGER_APPROVAL"
    },
    note: {
      type: String,
      trim: true
    },
    preferredDate: {
      type: Date
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: {
      type: Date
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    rejectedAt: {
      type: Date
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    countingDeadline: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    confirmedAt: {
      type: Date
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    targetStoredItemIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "StoredItem"
      }
    ],
    inventoryAdjusted: {
      type: Boolean,
      default: false
    },
    recountRound: {
      type: Number,
      default: 0
    },
    recountRequestedAt: {
      type: Date
    },
    recountRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    recountDecisionAt: {
      type: Date
    },
    recountDecisionBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    recountRejectedReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
CycleCountSchema.index({ contractId: 1 });
CycleCountSchema.index({ createdByCustomerId: 1 });
CycleCountSchema.index({ status: 1 });
CycleCountSchema.index({ approvedBy: 1 });
CycleCountSchema.index({ createdAt: -1 });

const CycleCount = mongoose.model<ICycleCount>("CycleCount", CycleCountSchema);

export default CycleCount;
