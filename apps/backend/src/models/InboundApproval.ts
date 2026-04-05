import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInboundApproval extends Document {
  inboundRequestId: Types.ObjectId; // FK → StorageRequest
  managerId: Types.ObjectId; // FK → User
  decision: "APPROVED" | "REJECTED";
  note?: string;
  approvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InboundApprovalSchema = new Schema<IInboundApproval>(
  {
    inboundRequestId: {
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

// Note: inboundRequestId already has a unique index via `unique: true` above,
// so we don't need to add another explicit unique index for it here.
InboundApprovalSchema.index({ managerId: 1 });
InboundApprovalSchema.index({ decision: 1 });

const InboundApproval = mongoose.model<IInboundApproval>(
  "InboundApproval",
  InboundApprovalSchema
);

export default InboundApproval;

