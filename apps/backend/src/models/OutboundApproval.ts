import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOutboundApproval extends Document {
  outboundRequestId: Types.ObjectId; // FK → StorageRequest
  managerId: Types.ObjectId; // FK → User
  decision: "APPROVED" | "REJECTED";
  note?: string;
  approvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboundApprovalSchema = new Schema<IOutboundApproval>(
  {
    outboundRequestId: {
      type: Schema.Types.ObjectId,
      ref: "StorageRequest",
      required: true,
      unique: true
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    decision: {
      type: String,
      enum: ["APPROVED", "REJECTED"],
      required: true
    },
    note: {
      type: String,
      trim: true
    },
    approvedAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

// Note: outboundRequestId already has a unique index via `unique: true` above,
// so we don't need to add another explicit unique index for it here.
OutboundApprovalSchema.index({ managerId: 1 });
OutboundApprovalSchema.index({ decision: 1 });

const OutboundApproval = mongoose.model<IOutboundApproval>(
  "OutboundApproval",
  OutboundApprovalSchema
);

export default OutboundApproval;
