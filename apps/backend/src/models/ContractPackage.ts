import mongoose, { Document, Schema } from "mongoose";

export type ContractPackageUnit = "day" | "month" | "year";

export interface IContractPackage extends Document {
  name: string;
  duration: number;
  unit: ContractPackageUnit;
  price: number;
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
    price: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export const ContractPackage = mongoose.model<IContractPackage>(
  "ContractPackage",
  ContractPackageSchema
);

