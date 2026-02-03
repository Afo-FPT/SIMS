import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICycleCountAssignment extends Document {
  cycleCountId: Types.ObjectId;
  staffId: Types.ObjectId;
  assignedAt: Date;
  assignedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CycleCountAssignmentSchema = new Schema<ICycleCountAssignment>(
  {
    cycleCountId: {
      type: Schema.Types.ObjectId,
      ref: "CycleCount",
      required: true
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Unique constraint: one staff can only be assigned once per cycle count
CycleCountAssignmentSchema.index({ cycleCountId: 1, staffId: 1 }, { unique: true });

// Indexes for faster queries
CycleCountAssignmentSchema.index({ cycleCountId: 1 });
CycleCountAssignmentSchema.index({ staffId: 1 });
CycleCountAssignmentSchema.index({ staffId: 1, cycleCountId: 1 });

const CycleCountAssignment = mongoose.model<ICycleCountAssignment>(
  "CycleCountAssignment",
  CycleCountAssignmentSchema
);

export default CycleCountAssignment;
