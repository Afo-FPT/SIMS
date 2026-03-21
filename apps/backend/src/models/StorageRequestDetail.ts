import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStorageRequestDetail extends Document {
  requestId: Types.ObjectId;
  /** For IN requests: shelfId can be assigned later by staff during putaway */
  shelfId?: Types.ObjectId;
  itemName: string;
  unit: string;
  /** Optional: quantity per 1 unit/package (for customer request payload) */
  quantityPerUnit?: number;
  /** Optional: physical volume of one unit in cubic meters (m3) */
  volumePerUnitM3?: number;
  quantityRequested: number;
  quantityActual?: number;
  /** Staff-reported: quantity damaged/lost */
  damageQuantity?: number;
  /** Staff-reported: reason code for loss/damage */
  lossReason?: string;
  /** Staff-reported: free-text notes */
  lossNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StorageRequestDetailSchema = new Schema<IStorageRequestDetail>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "StorageRequest",
      required: true
    },
    shelfId: {
      type: Schema.Types.ObjectId,
      ref: "Shelf",
      required: false
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: "pcs"
    },
    quantityPerUnit: {
      type: Number,
      min: 0
    },
    volumePerUnitM3: {
      type: Number,
      min: 0
    },
    quantityRequested: {
      type: Number,
      required: true,
      min: 0
    },
    quantityActual: {
      type: Number,
      min: 0
    },
    damageQuantity: { type: Number, min: 0 },
    lossReason: { type: String, trim: true },
    lossNotes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

StorageRequestDetailSchema.index({ requestId: 1 });
StorageRequestDetailSchema.index({ shelfId: 1 });

const StorageRequestDetail = mongoose.model<IStorageRequestDetail>("StorageRequestDetail", StorageRequestDetailSchema);

export default StorageRequestDetail;
