import mongoose, { Schema, Document, Types } from "mongoose";

export type RentRequestStatus = "Draft" | "Submitted" | "Approved" | "Rejected";

export interface IRentRequest extends Document {
  customerId: Types.ObjectId;
  shelves: number;
  startDate: Date;
  durationMonths: number;
  zonePreference?: string;
  goodsCategory: string[];
  handlingNotes: string[];
  specialNotes?: string;
  countingUnit: string;
  conversionRule?: {
    boxToPiece?: number;
    cartonToBox?: number;
    palletToCarton?: number;
  };
  status: RentRequestStatus;
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentRequestSchema = new Schema<IRentRequest>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shelves: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    zonePreference: {
      type: String,
      default: null,
    },
    goodsCategory: {
      type: [String],
      default: [],
    },
    handlingNotes: {
      type: [String],
      default: [],
    },
    specialNotes: {
      type: String,
      default: null,
    },
    countingUnit: {
      type: String,
      required: true,
    },
    conversionRule: {
      boxToPiece: { type: Number, default: null },
      cartonToBox: { type: Number, default: null },
      palletToCarton: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft",
    },
    rejectReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

RentRequestSchema.index({ customerId: 1, status: 1 });

const RentRequest = mongoose.model<IRentRequest>("RentRequest", RentRequestSchema);

export default RentRequest;

