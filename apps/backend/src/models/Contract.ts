import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Interface for rented shelf item in contract
 * Customer rents the entire shelf (all tiers/levels)
 */
export interface IRentedShelf {
  shelfId: Types.ObjectId;
  area?: number; // Optional: total area in m² (all tiers)
  capacity?: number; // Optional: total capacity in kg or m³ (all tiers)
  startDate: Date;
  endDate: Date;
  price: number; // Price for the entire shelf
}

/**
 * Contract interface
 */
export interface IContract extends Document {
  contractCode: string; // Unique contract code
  customerId: Types.ObjectId; // FK → User (customer)
  warehouseId: Types.ObjectId; // FK → Warehouse
  rentedShelves: IRentedShelf[]; // Array of rented shelf levels
  status: "draft" | "active" | "expired" | "terminated";
  createdBy: Types.ObjectId; // FK → User (manager)
  createdAt: Date;
  updatedAt: Date;
}

const RentedShelfSchema = new Schema<IRentedShelf>(
  {
    shelfId: {
      type: Schema.Types.ObjectId,
      ref: "Shelf",
      required: true
    },
    
    area: {
      type: Number,
      min: 0
    },
    capacity: {
      type: Number,
      min: 0
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const ContractSchema = new Schema<IContract>(
  {
    contractCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    rentedShelves: {
      type: [RentedShelfSchema],
      required: true,
      validate: {
        validator: function (v: IRentedShelf[]) {
          return v && v.length > 0;
        },
        message: "At least one rented shelf is required"
      }
    },
    status: {
      type: String,
      enum: ["draft", "active", "expired", "terminated"],
      default: "draft"
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

// Indexes for faster queries
// Note: contractCode index is already created by unique: true, so we don't need to add it again
ContractSchema.index({ customerId: 1 });
ContractSchema.index({ warehouseId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ createdBy: 1 });
ContractSchema.index({ "rentedShelves.shelfId": 1 });

const Contract = mongoose.model<IContract>("Contract", ContractSchema);

export default Contract;
