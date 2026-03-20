import mongoose, { Schema, Document, Types } from "mongoose";

export type RequestCreditStatus = "available" | "reserved" | "consumed";
export type RequestCreditEntityType = "IN" | "OUT" | "CYCLE";

export interface IRequestCredit extends Document {
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  weekStart: Date;
  status: RequestCreditStatus;
  credits: number;

  reservationToken?: string;
  reservedEntityType?: RequestCreditEntityType;
  reservedEntityId?: Types.ObjectId;

  consumedAt?: Date;
}

const RequestCreditSchema = new Schema<IRequestCredit>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true, index: true },
    weekStart: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["available", "reserved", "consumed"],
      default: "available",
      index: true
    },
    credits: { type: Number, default: 1, required: true, min: 1 },

    reservationToken: { type: String },
    reservedEntityType: { type: String, enum: ["IN", "OUT", "CYCLE"] },
    reservedEntityId: { type: Schema.Types.ObjectId },

    consumedAt: { type: Date }
  },
  { timestamps: true }
);

RequestCreditSchema.index({ customerId: 1, contractId: 1, weekStart: 1, status: 1 });
RequestCreditSchema.index({ customerId: 1, contractId: 1, reservedEntityType: 1, reservedEntityId: 1, status: 1 });

const RequestCredit = mongoose.model<IRequestCredit>("RequestCredit", RequestCreditSchema);

export default RequestCredit;
