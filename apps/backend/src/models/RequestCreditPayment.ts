import mongoose, { Schema, Document, Types } from "mongoose";

export type RequestCreditPaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface IRequestCreditPayment extends Document {
  customerId: Types.ObjectId;
  contractId: Types.ObjectId;
  creditsGranted: number;
  amount: number;
  gateway: "vnpay";
  status: RequestCreditPaymentStatus;

  vnpTxnRef: string;
  vnpOrderInfo: string;

  vnpResponseCode?: string;
  vnpPayDate?: string;
  rawData?: any;
  paidAt?: Date;
}

const RequestCreditPaymentSchema = new Schema<IRequestCreditPayment>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true, index: true },
    creditsGranted: { type: Number, default: 1, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },

    gateway: { type: String, enum: ["vnpay"], default: "vnpay" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending"
    },

    vnpTxnRef: { type: String, required: true, index: true, unique: true },
    vnpOrderInfo: { type: String, required: true },

    vnpResponseCode: { type: String },
    vnpPayDate: { type: String },
    rawData: { type: Schema.Types.Mixed },

    paidAt: { type: Date }
  },
  { timestamps: true }
);

RequestCreditPaymentSchema.index({ customerId: 1, contractId: 1, status: 1 });

const RequestCreditPayment = mongoose.model<IRequestCreditPayment>(
  "RequestCreditPayment",
  RequestCreditPaymentSchema
);

export default RequestCreditPayment;

