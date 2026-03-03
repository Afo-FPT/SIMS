import { Types } from "mongoose";
import Contract from "../models/Contract";
import Payment, { IPayment, PaymentStatus } from "../models/Payment";
import { buildVNPayPaymentUrl, verifyVNPayReturn } from "../config/vnpay";
import { DEFAULT_PRICE_PER_ZONE } from "./contract.service";

export interface StartVNPayPaymentResult {
  payment: IPayment;
  paymentUrl: string;
  expireAt: string;
}

export async function startVNPayPaymentForContract(
  contractId: string,
  customerId: string,
  clientIp: string
): Promise<StartVNPayPaymentResult> {
  if (!Types.ObjectId.isValid(contractId)) {
    throw new Error("Invalid contract ID");
  }

  const contract = await Contract.findById(contractId)
    .populate("customerId", "name")
    .populate("warehouseId", "name");

  if (!contract) {
    throw new Error("Contract not found");
  }

  if (contract.status !== "pending_payment") {
    throw new Error("Contract is not in pending_payment status.");
  }

  let amount = 0;
  if (contract.rentedZones && contract.rentedZones.length > 0) {
    amount = contract.rentedZones.reduce((sum, rz) => sum + (rz.price || 0), 0);
  } else {
    amount = DEFAULT_PRICE_PER_ZONE;
  }

  if (!amount || amount <= 0) {
    throw new Error("Invalid contract amount for payment.");
  }

  const existingPending = await Payment.findOne({
    contractId: contract._id,
    status: "pending"
  });
  if (existingPending) {
    // Optionally we could reuse existing txnRef, but easier to prevent duplicates.
    throw new Error("There is already a pending payment for this contract. Please complete it first.");
  }

  const orderInfo = `Thanh toan hop dong ${contract.contractCode}`;
  const txnRef = `${contract.contractCode}-${Date.now()}`;

  const vnpResult = buildVNPayPaymentUrl({
    amount,
    orderInfo,
    orderId: txnRef,
    ipAddr: clientIp || "0.0.0.0"
  });

  const payment = await Payment.create({
    contractId: contract._id,
    amount,
    gateway: "vnpay",
    status: "pending",
    vnpTxnRef: vnpResult.vnp_TxnRef,
    vnpOrderInfo: orderInfo
  });

  return {
    payment,
    paymentUrl: vnpResult.url,
    expireAt: vnpResult.vnp_ExpireDate
  };
}

export interface HandleVNPayReturnResult {
  payment: IPayment;
  contractId: string;
  success: boolean;
  message: string;
}

export async function handleVNPayReturn(
  query: Record<string, any>
): Promise<HandleVNPayReturnResult> {
  const { isValid, vnp_ResponseCode } = verifyVNPayReturn(query);

  const txnRef = query["vnp_TxnRef"] as string | undefined;
  if (!txnRef) {
    throw new Error("Missing vnp_TxnRef");
  }

  const payment = await Payment.findOne({ vnpTxnRef: txnRef });
  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.status === "paid") {
    return {
      payment,
      contractId: payment.contractId.toString(),
      success: true,
      message: "Payment already completed"
    };
  }

  let newStatus: PaymentStatus = "failed";
  let message = "Payment failed";

  if (!isValid) {
    newStatus = "failed";
    message = "Invalid VNPay signature";
  } else if (vnp_ResponseCode === "00") {
    newStatus = "paid";
    message = "Payment successful";
  } else {
    newStatus = "failed";
    message = `Payment failed with code ${vnp_ResponseCode}`;
  }

  payment.status = newStatus;
  payment.vnpResponseCode = vnp_ResponseCode;
  payment.vnpPayDate = query["vnp_PayDate"] as string | undefined;
  payment.rawData = query;
  if (newStatus === "paid") {
    payment.paidAt = new Date();
  }
  await payment.save();

  const contractId = payment.contractId.toString();

  if (newStatus === "paid") {
    const contract = await Contract.findById(contractId);
    if (contract && contract.status === "pending_payment") {
      contract.status = "active";
      await contract.save();
    }
  }

  return {
    payment,
    contractId,
    success: newStatus === "paid",
    message
  };
}

export async function getPaymentsForManager(): Promise<IPayment[]> {
  return Payment.find({})
    .populate("contractId", "contractCode status customerId warehouseId")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec() as unknown as IPayment[];
}

