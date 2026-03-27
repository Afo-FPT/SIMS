import mongoose, { Schema, Document, Types } from "mongoose";

export type WarehouseIssueReportType =
  | "damage"
  | "safety"
  | "equipment"
  | "inventory"
  | "other";

export interface IWarehouseIssueReport extends Document {
  staffId: Types.ObjectId;
  warehouseId?: Types.ObjectId;
  note: string;
  type?: WarehouseIssueReportType;
  status: "open" | "acknowledged" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseIssueReportSchema = new Schema<IWarehouseIssueReport>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse"
    },
    note: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["damage", "safety", "equipment", "inventory", "other"],
      trim: true
    },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open"
    }
  },
  {
    timestamps: true
  }
);

WarehouseIssueReportSchema.index({ staffId: 1 });
WarehouseIssueReportSchema.index({ warehouseId: 1 });
WarehouseIssueReportSchema.index({ status: 1 });
WarehouseIssueReportSchema.index({ createdAt: -1 });

const WarehouseIssueReport = mongoose.model<IWarehouseIssueReport>(
  "WarehouseIssueReport",
  WarehouseIssueReportSchema
);

export default WarehouseIssueReport;
