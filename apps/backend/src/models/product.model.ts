import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  productName: string;
  description?: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  status: "Active" | "Inactive";
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: false,
    },
  }
);

export const Product = model<IProduct>("Product", ProductSchema);

export default {
  Product,
};
