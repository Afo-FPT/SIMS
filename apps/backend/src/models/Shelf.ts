import mongoose, { Schema, Document, Types } from "mongoose";

export interface IShelf extends Document {
  warehouseId: Types.ObjectId;
  shelfCode: string;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
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
    capacity: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"],
      default: "AVAILABLE"
    }
  },
  {
    timestamps: true
  }
);

ShelfSchema.index({ warehouseId: 1 });
ShelfSchema.index({ shelfCode: 1 });

const Shelf = mongoose.model<IShelf>("Shelf", ShelfSchema);

export default Shelf;
