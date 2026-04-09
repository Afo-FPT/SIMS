import mongoose, { Document, Schema } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  zoneAreaPercentOfWarehouse: number;
  shelfAreaPercentOfZone: number;
  baseRequestCreditPriceVnd: number;
  expiredContractPenaltyPerDayVnd: number;
  weeklyFreeRequestLimit: number;
  warehouseCreationTerms?: string;
  rentalDraftTermsContent?: string;
  rentalDraftTermsAgreementLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    zoneAreaPercentOfWarehouse: { type: Number, required: true, min: 1, max: 100, default: 80 },
    shelfAreaPercentOfZone: { type: Number, required: true, min: 1, max: 100, default: 80 },
    baseRequestCreditPriceVnd: { type: Number, required: true, min: 0, default: 100000 },
    expiredContractPenaltyPerDayVnd: { type: Number, required: true, min: 0, default: 0 },
    weeklyFreeRequestLimit: { type: Number, required: true, min: 0, default: 3 },
    warehouseCreationTerms: { type: String, trim: true, default: "" },
    rentalDraftTermsContent: { type: String, trim: true, default: "" },
    rentalDraftTermsAgreementLabel: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// key already has `unique: true` above.

const SystemSetting = mongoose.model<ISystemSetting>("SystemSetting", SystemSettingSchema);

export default SystemSetting;
