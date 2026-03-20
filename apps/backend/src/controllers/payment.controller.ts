import { Request, Response } from "express";
import {
  getPaymentsForManager,
  handleVNPayReturn,
  startVNPayPaymentForContract,
  startVNPayPaymentForRequestCredits
} from "../services/payment.service";

export async function startVNPayPaymentController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "0.0.0.0";

    const result = await startVNPayPaymentForContract(
      id,
      req.user.userId,
      clientIp
    );

    res.status(201).json({
      message: "VNPay payment created",
      data: {
        paymentId: result.payment._id,
        contractId: result.payment.contractId,
        amount: result.payment.amount,
        status: result.payment.status,
        paymentUrl: result.paymentUrl,
        expireAt: result.expireAt
      }
    });
  } catch (error: any) {
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("Access denied") ||
      error.message.includes("pending payment")
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

export async function startVNPayRequestCreditPaymentController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "0.0.0.0";

    const result = await startVNPayPaymentForRequestCredits(req.user.userId, clientIp);

    res.status(201).json({
      message: "VNPay request credit payment created",
      data: {
        paymentId: result.payment._id,
        customerId: result.payment.customerId,
        amount: result.payment.amount,
        status: result.payment.status,
        paymentUrl: result.paymentUrl,
        expireAt: result.expireAt
      }
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

export async function vnpayReturnController(req: Request, res: Response) {
  try {
    const result = await handleVNPayReturn(req.query as any);

    const baseUrl =
      process.env.FRONTEND_BASE_URL || "http://localhost:3000";

    let redirectUrl = "";
    if (result.type === "contract" && result.contractId) {
      redirectUrl = `${baseUrl}/customer/contracts/${result.contractId}/checkout?result=${
        result.success ? "success" : "failed"
      }&message=${encodeURIComponent(result.message)}`;
    } else {
      // Credit payments: keep users on existing UI route for now
      redirectUrl = `${baseUrl}/customer/contracts?creditResult=${
        result.success ? "success" : "failed"
      }&message=${encodeURIComponent(result.message)}`;
    }

    res.redirect(302, redirectUrl);
  } catch (error: any) {
    const baseUrl =
      process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/customer/contracts?paymentError=${encodeURIComponent(
      error.message || "Payment error"
    )}`;
    res.redirect(302, redirectUrl);
  }
}

export async function listPaymentsForManagerController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({ message: "Only managers can view payments" });
    }

    const payments = await getPaymentsForManager();
    res.json({
      message: "Payments retrieved successfully",
      data: payments
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

