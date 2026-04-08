import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStaffWarehouse extends Document {
  staffId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffWarehouseSchema = new Schema<IStaffWarehouse>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
  },
  { timestamps: true }
);

// Business rule:
// - A staff can belong to many warehouses.
// - A warehouse can have only one staff.
StaffWarehouseSchema.index({ warehouseId: 1 }, { unique: true });
StaffWarehouseSchema.index({ staffId: 1 });

const StaffWarehouse = mongoose.model<IStaffWarehouse>("StaffWarehouse", StaffWarehouseSchema);

export default StaffWarehouse;

