import mongoose, { Schema, Document, Types } from "mongoose";

export interface IContract extends Document {
  customerId: Types.ObjectId;
  shelfId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    shelfId: {
      type: Schema.Types.ObjectId,
      ref: "Shelf",
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true
  }
);

ContractSchema.index({ customerId: 1 });
ContractSchema.index({ shelfId: 1 });
ContractSchema.index({ status: 1 });

const Contract = mongoose.model<IContract>("Contract", ContractSchema);

export default Contract;
