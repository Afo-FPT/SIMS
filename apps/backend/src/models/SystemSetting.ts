import mongoose, { Document, Schema } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  zoneAreaPercentOfWarehouse: number;
  shelfAreaPercentOfZone: number;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    zoneAreaPercentOfWarehouse: { type: Number, required: true, min: 1, max: 100, default: 80 },
    shelfAreaPercentOfZone: { type: Number, required: true, min: 1, max: 100, default: 80 },
  },
  { timestamps: true }
);

SystemSettingSchema.index({ key: 1 }, { unique: true });

const SystemSetting = mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);

export default SystemSetting;
