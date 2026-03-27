import mongoose, { Document, Schema, Types } from "mongoose";

export type ContractPackageUnit = "day" | "month" | "year";

export interface IContractPackage extends Document {
  name: string;
  warehouseId: Types.ObjectId;
  duration: number;
  unit: ContractPackageUnit;
  pricePerM2: number;
  pricePerDay: number;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContractPackageSchema = new Schema<IContractPackage>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      enum: ["day", "month", "year"],
      required: true
    },
    pricePerM2: { type: Number, required: true, min: 0 },
    pricePerDay: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, required: true, default: true },
    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

ContractPackageSchema.index({ warehouseId: 1 });

export const ContractPackage = mongoose.model<IContractPackage>(
  "ContractPackage",
  ContractPackageSchema
);

