import mongoose, { Schema, Document, Types } from "mongoose";

export interface IZone extends Document {
  zoneCode: string;
  name: string;
  warehouseId: Types.ObjectId;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    zoneCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
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
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
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

ZoneSchema.index({ warehouseId: 1 });
ZoneSchema.index({ warehouseId: 1, zoneCode: 1 }, { unique: true });
ZoneSchema.index({ status: 1 });

const Zone = mongoose.model<IZone>("Zone", ZoneSchema);

export default Zone;
