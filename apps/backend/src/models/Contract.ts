import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Contract rents Zone(s). Each zone contains shelves for detailed location tracking.
 */
export interface IRentedZone {
  zoneId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  price: number;
}

/**
 * Contract interface
 * Contract is tied to Zone(s), not to individual shelves.
 * When draft from customer: requestedZoneId/requestedStartDate/requestedEndDate; manager activates to assign zone.
 */
export interface IContract extends Document {
  contractCode: string;
  customerId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  rentedZones: IRentedZone[];
  /** Customer draft: single zone request; assigned when manager activates */
  requestedZoneId?: Types.ObjectId;
  requestedStartDate?: Date;
  requestedEndDate?: Date;
  status: "draft" | "pending_payment" | "active" | "expired" | "terminated";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RentedZoneSchema = new Schema<IRentedZone>(
  {
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
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
    rentedZones: {
      type: [RentedZoneSchema],
      default: [],
      validate: {
        validator: function (v: IRentedZone[]) {
          return Array.isArray(v);
        },
        message: "rentedZones must be an array"
      }
    },
    requestedZoneId: { type: Schema.Types.ObjectId, ref: "Zone" },
    requestedStartDate: { type: Date },
    requestedEndDate: { type: Date },
    status: {
      type: String,
    enum: ["draft", "pending_payment", "active", "expired", "terminated"],
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

ContractSchema.index({ customerId: 1 });
ContractSchema.index({ warehouseId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ createdBy: 1 });
ContractSchema.index({ "rentedZones.zoneId": 1 });

const Contract = mongoose.model<IContract>("Contract", ContractSchema);

export default Contract;
