import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWarehouse extends Document {
  name: string;
  address: string;
  length: number;
  width: number;
  area: number;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    length: {
      type: Number,
      required: true,
      min: 0
    },
    width: {
      type: Number,
      required: true,
      min: 0
    },
    area: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE"
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
// Note: name index is already created by unique: true, so we don't need to add it again
WarehouseSchema.index({ createdBy: 1 });
WarehouseSchema.index({ status: 1 });

const Warehouse = mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);

export default Warehouse;
