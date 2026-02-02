import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStorageRequestDetail extends Document {
  requestId: Types.ObjectId;
  /** For IN requests: shelfId can be assigned later by staff during putaway */
  shelfId?: Types.ObjectId;
  itemName: string;
  unit: string;
  /** Optional: quantity per 1 unit/package (for customer request payload) */
  quantityPerUnit?: number;
  quantityRequested: number;
  quantityActual?: number;
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
    quantityRequested: {
      type: Number,
      required: true,
      min: 0
    },
    quantityActual: {
      type: Number,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

StorageRequestDetailSchema.index({ requestId: 1 });
StorageRequestDetailSchema.index({ shelfId: 1 });

const StorageRequestDetail = mongoose.model<IStorageRequestDetail>("StorageRequestDetail", StorageRequestDetailSchema);

export default StorageRequestDetail;
