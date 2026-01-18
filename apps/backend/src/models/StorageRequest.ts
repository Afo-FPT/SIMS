import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStorageRequest extends Document {
  contractId: Types.ObjectId;
  customerId: Types.ObjectId;
  requestType: "IN" | "OUT";
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
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
    requestType: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DONE_BY_STAFF", "COMPLETED", "REJECTED"],
      default: "PENDING"
    },
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
StorageRequestSchema.index({ status: 1 });
StorageRequestSchema.index({ requestType: 1 });

const StorageRequest = mongoose.model<IStorageRequest>("StorageRequest", StorageRequestSchema);

export default StorageRequest;
