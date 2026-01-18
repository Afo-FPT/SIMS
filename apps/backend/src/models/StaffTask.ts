import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStaffTask extends Document {
  requestId: Types.ObjectId;
  staffId: Types.ObjectId;
  taskStatus: "ASSIGNED" | "IN_PROGRESS" | "DONE";
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffTaskSchema = new Schema<IStaffTask>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "StorageRequest",
      required: true
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    taskStatus: {
      type: String,
      enum: ["ASSIGNED", "IN_PROGRESS", "DONE"],
      default: "ASSIGNED"
    },
    startedAt: {
      type: Date
    },
    finishedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

StaffTaskSchema.index({ requestId: 1 });
StaffTaskSchema.index({ staffId: 1 });
StaffTaskSchema.index({ taskStatus: 1 });

const StaffTask = mongoose.model<IStaffTask>("StaffTask", StaffTaskSchema);

export default StaffTask;
