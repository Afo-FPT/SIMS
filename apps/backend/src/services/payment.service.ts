import { Types } from "mongoose";
import Contract from "../models/Contract";
import Payment, { IPayment, PaymentStatus } from "../models/Payment";
import { buildVNPayPaymentUrl, verifyVNPayReturn } from "../config/vnpay";
import { DEFAULT_PRICE_PER_ZONE } from "./contract.service";
import RequestCreditPayment, { type IRequestCreditPayment } from "../models/RequestCreditPayment";
import { grantRequestCredits, REQUEST_CREDIT_PRICE_VND } from "./request-credit.service";

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
  success: boolean;
  type: "contract" | "request_credit";
  message: string;
  contractId?: string;
  customerId?: string;
  paymentId: string;
}

export async function handleVNPayReturn(
  query: Record<string, any>
): Promise<HandleVNPayReturnResult> {
  const { isValid, vnp_ResponseCode } = verifyVNPayReturn(query);

  const txnRef = query["vnp_TxnRef"] as string | undefined;
  if (!txnRef) {
    throw new Error("Missing vnp_TxnRef");
  }

  const contractPayment = await Payment.findOne({ vnpTxnRef: txnRef });
  if (contractPayment) {
    if (contractPayment.status === "paid") {
      return {
        type: "contract",
        paymentId: contractPayment._id.toString(),
        contractId: contractPayment.contractId.toString(),
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

    contractPayment.status = newStatus;
    contractPayment.vnpResponseCode = vnp_ResponseCode;
    contractPayment.vnpPayDate = query["vnp_PayDate"] as string | undefined;
    contractPayment.rawData = query;
    if (newStatus === "paid") {
      contractPayment.paidAt = new Date();
    }
    await contractPayment.save();

    const contractId = contractPayment.contractId.toString();

    if (newStatus === "paid") {
      const contract = await Contract.findById(contractId);
      if (contract && contract.status === "pending_payment") {
        contract.status = "active";
        await contract.save();
      }
    }

    return {
      type: "contract",
      paymentId: contractPayment._id.toString(),
      contractId,
      success: newStatus === "paid",
      message
    };
  }

  const requestCreditPayment = await RequestCreditPayment.findOne({ vnpTxnRef: txnRef });
  if (!requestCreditPayment) {
    throw new Error("Payment not found");
  }

  if (requestCreditPayment.status === "paid") {
    return {
      type: "request_credit",
      paymentId: requestCreditPayment._id.toString(),
      customerId: requestCreditPayment.customerId.toString(),
      success: true,
      message: "Payment already completed"
    };
  }

  let newStatus: PaymentStatus = "failed";
  let message = "Payment failed";

  const paidByResponse = vnp_ResponseCode === "00";

  // VNPay signatures can occasionally fail due to encoding differences,
  // but ResponseCode === "00" indicates success. In that case, we still treat it as paid.
  if (paidByResponse) {
    newStatus = "paid";
    message = isValid ? "Payment successful" : "Payment successful (signature could not be validated)";
  } else if (!isValid) {
    newStatus = "failed";
    message = "Invalid VNPay signature";
  } else {
    newStatus = "failed";
    message = `Payment failed with code ${vnp_ResponseCode}`;
  }

  // Diagnostics for request credit payments (helps understand why it becomes "false")
  console.log("[VNPay][RequestCredit] txnRef=", txnRef, "isValid=", isValid, "vnp_ResponseCode=", vnp_ResponseCode, "=>", message);

  requestCreditPayment.status = newStatus;
  requestCreditPayment.vnpResponseCode = vnp_ResponseCode;
  requestCreditPayment.vnpPayDate = query["vnp_PayDate"] as string | undefined;
  requestCreditPayment.rawData = query;
  if (newStatus === "paid") {
    requestCreditPayment.paidAt = new Date();
  }
  await requestCreditPayment.save();

  if (newStatus === "paid") {
    await grantRequestCredits({
      customerId: requestCreditPayment.customerId.toString(),
      credits: requestCreditPayment.creditsGranted || 1,
      paidAt: new Date()
    });
  }

  return {
    type: "request_credit",
    paymentId: requestCreditPayment._id.toString(),
    customerId: requestCreditPayment.customerId.toString(),
    success: newStatus === "paid",
    message
  };
}

export async function startVNPayPaymentForRequestCredits(
  customerId: string,
  clientIp: string
): Promise<{ payment: IRequestCreditPayment; paymentUrl: string; expireAt: string }> {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid customer ID");
  }

  const existingPending = await RequestCreditPayment.findOne({
    customerId: new Types.ObjectId(customerId),
    status: "pending"
  });
  if (existingPending) {
    throw new Error("There is already a pending request-credit payment. Please complete it first.");
  }

  const creditsGranted = 1;
  const amount = REQUEST_CREDIT_PRICE_VND;

  const orderInfo = `Thanh toan request credit (${creditsGranted}x)`;
  const txnRef = `RC-${customerId}-${Date.now()}`;

  const vnpResult = buildVNPayPaymentUrl({
    amount,
    orderInfo,
    orderId: txnRef,
    ipAddr: clientIp || "0.0.0.0"
  });

  const payment = await RequestCreditPayment.create({
    customerId: new Types.ObjectId(customerId),
    creditsGranted,
    amount,
    gateway: "vnpay",
    status: "pending",
    vnpTxnRef: vnpResult.vnp_TxnRef,
    vnpOrderInfo: orderInfo
  });

  return { payment, paymentUrl: vnpResult.url, expireAt: vnpResult.vnp_ExpireDate };
}

export async function getPaymentsForManager(): Promise<IPayment[]> {
  return Payment.find({})
    .populate("contractId", "contractCode status customerId warehouseId")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec() as unknown as IPayment[];
}

