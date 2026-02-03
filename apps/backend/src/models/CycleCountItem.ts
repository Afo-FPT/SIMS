import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICycleCountItem extends Document {
  cycleCountId: Types.ObjectId;
  shelfId: Types.ObjectId;
  storedItemId: Types.ObjectId;
  systemQuantity: number;
  countedQuantity: number;
  discrepancy: number; // countedQuantity - systemQuantity
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CycleCountItemSchema = new Schema<ICycleCountItem>(
  {
    cycleCountId: {
      type: Schema.Types.ObjectId,
      ref: "CycleCount",
      required: true
    },
    shelfId: {
      type: Schema.Types.ObjectId,
      ref: "Shelf",
      required: true
    },
    storedItemId: {
      type: Schema.Types.ObjectId,
      ref: "StoredItem",
      required: true
    },
    systemQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    countedQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    discrepancy: {
      type: Number,
      required: true
      // Can be negative (shortage) or positive (surplus)
    },
    note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate discrepancy
CycleCountItemSchema.pre("save", function (next) {
  this.discrepancy = this.countedQuantity - this.systemQuantity;
  next();
});

// Indexes for faster queries
CycleCountItemSchema.index({ cycleCountId: 1 });
CycleCountItemSchema.index({ shelfId: 1 });
CycleCountItemSchema.index({ storedItemId: 1 });
CycleCountItemSchema.index({ cycleCountId: 1, shelfId: 1 });

const CycleCountItem = mongoose.model<ICycleCountItem>(
  "CycleCountItem",
  CycleCountItemSchema
);

export default CycleCountItem;
