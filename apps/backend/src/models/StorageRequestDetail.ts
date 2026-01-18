import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStorageRequestDetail extends Document {
  requestId: Types.ObjectId;
  shelfId: Types.ObjectId;
  itemName: string;
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
      required: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
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
