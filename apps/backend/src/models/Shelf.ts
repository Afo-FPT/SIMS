import mongoose, { Schema, Document, Types } from "mongoose";

export interface IShelf extends Document {
  warehouseId: Types.ObjectId;
  shelfCode: string;
  tierCount: number;
  width: number;
  depth: number;
  maxCapacity: number;
  status: "AVAILABLE" | "RENTED" | "MAINTENANCE";
  createdAt: Date;
  updatedAt: Date;
}

const ShelfSchema = new Schema<IShelf>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    shelfCode: {
      type: String,
      required: true,
      trim: true
    },
    tierCount: {
      type: Number,
      required: true,
      min: 1
    },
    width: {
      type: Number,
      required: true,
      min: 0
    },
    depth: {
      type: Number,
      required: true,
      min: 0
    },
    maxCapacity: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "RENTED", "MAINTENANCE"],
      default: "AVAILABLE"
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: shelfCode must be unique per warehouse
ShelfSchema.index({ warehouseId: 1, shelfCode: 1 }, { unique: true });
ShelfSchema.index({ warehouseId: 1 });
ShelfSchema.index({ status: 1 });

const Shelf = mongoose.model<IShelf>("Shelf", ShelfSchema);

export default Shelf;
