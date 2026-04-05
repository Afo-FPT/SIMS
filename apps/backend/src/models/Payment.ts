import mongoose, { Schema, Document, Types } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface IPayment extends Document {
  contractId: Types.ObjectId;
  amount: number;
  gateway: "vnpay";
  status: PaymentStatus;
  vnpTxnRef: string;
  vnpOrderInfo: string;
  paymentUrl?: string;
  vnpExpireDate?: string;
  vnpResponseCode?: string;
  vnpPayDate?: string;
  rawData?: any;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    gateway: {
      type: String,
      enum: ["vnpay"],
      default: "vnpay"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending"
    },
    vnpTxnRef: {
      type: String,
      required: true,
      index: true,
      unique: true
    },
    vnpOrderInfo: {
      type: String,
      required: true
    },
    paymentUrl: {
      type: String
    },
    vnpExpireDate: {
      type: String
    },
    vnpResponseCode: {
      type: String
    },
    vnpPayDate: {
      type: String
    },
    rawData: {
      type: Schema.Types.Mixed
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

PaymentSchema.index({ contractId: 1 });
PaymentSchema.index({ status: 1 });

const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;

