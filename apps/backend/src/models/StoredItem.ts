import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStoredItem extends Document {
  contractId: Types.ObjectId;
  shelfId: Types.ObjectId;
  itemName: string;
  quantity: number;
  unit: string;
  quantityPerUnit?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoredItemSchema = new Schema<IStoredItem>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
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
    quantity: {
      type: Number,
      required: true,
      min: 0
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
    }
  },
  {
    timestamps: true
  }
);

StoredItemSchema.index({ contractId: 1 });
StoredItemSchema.index({ shelfId: 1 });
StoredItemSchema.index({ itemName: 1 });

const StoredItem = mongoose.model<IStoredItem>("StoredItem", StoredItemSchema);

export default StoredItem;
