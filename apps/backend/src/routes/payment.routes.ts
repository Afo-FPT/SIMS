import { Router } from "express";
import {
  getRequestCreditSummaryController,
  listPaymentsForManagerController,
  startVNPayPaymentController,
  startVNPayRequestCreditPaymentController,
  vnpayReturnController
} from "../controllers/payment.controller";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/payments/contracts/:id/vnpay/start
 * Customer start payment for a contract (status must be pending_payment)
 */
router.post(
  "/contracts/:id/vnpay/start",
  authenticate,
  authorizeRoles("customer"),
  startVNPayPaymentController
);

/**
 * POST /api/payments/request-credits/vnpay/start
 * Customer purchases 1 extra request credit (100,000 VND)
 */
router.post(
  "/request-credits/vnpay/start",
  authenticate,
  authorizeRoles("customer"),
  startVNPayRequestCreditPaymentController
);

/**
 * GET /api/payments/request-credits/summary?contractId=...
 * Customer gets weekly free-request summary for selected contract.
 */
router.get(
  "/request-credits/summary",
  authenticate,
  authorizeRoles("customer"),
  getRequestCreditSummaryController
);

/**
 * GET /api/payments/vnpay/return
 * VNPay return URL (customer browser is redirected here)
 * This endpoint does not require auth because VNPay server calls it.
 */
router.get("/vnpay/return", vnpayReturnController);

/**
 * GET /api/payments
 * Manager view payments (for monitoring in real-time via polling)
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("manager"),
  listPaymentsForManagerController
);

export default router;

