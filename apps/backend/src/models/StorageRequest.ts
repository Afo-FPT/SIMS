import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStorageRequest extends Document {
  contractId: Types.ObjectId;
  customerId: Types.ObjectId;
  /** Customer-selected zone for this request (used to constrain putaway shelves) */
  requestedZoneId?: Types.ObjectId;
  requestType: "IN" | "OUT";
  /** Customer-provided reference (e.g. IN-2025-0025, OUT-2025-0012) */
  reference?: string;
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  /** Set by manager when approving: staff who can see and complete this request */
  assignedStaffIds?: Types.ObjectId[];
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  customerConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorageRequestSchema = new Schema<IStorageRequest>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requestedZoneId: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
      required: false
    },
    requestType: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    reference: { type: String, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DONE_BY_STAFF", "COMPLETED", "REJECTED"],
      default: "PENDING"
    },
    assignedStaffIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: {
      type: Date
    },
    customerConfirmedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

StorageRequestSchema.index({ contractId: 1 });
StorageRequestSchema.index({ customerId: 1 });
StorageRequestSchema.index({ requestedZoneId: 1 });
StorageRequestSchema.index({ status: 1 });
StorageRequestSchema.index({ requestType: 1 });
StorageRequestSchema.index({ assignedStaffIds: 1 });

const StorageRequest = mongoose.model<IStorageRequest>("StorageRequest", StorageRequestSchema);

export default StorageRequest;
