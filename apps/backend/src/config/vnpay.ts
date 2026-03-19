import crypto from "crypto";
import querystring from "querystring";

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  returnUrl: string;
  ipnUrl?: string;
  locale?: string;
  currCode?: string;
}

export function getVNPayConfig(): VNPayConfig {
  const {
    VNP_TMN_CODE,
    VNP_HASH_SECRET,
    VNP_PAYMENT_URL,
    VNP_RETURN_URL,
    VNP_IPN_URL,
    VNP_LOCALE,
    VNP_CURR_CODE
  } = process.env;

  if (!VNP_TMN_CODE || !VNP_HASH_SECRET || !VNP_PAYMENT_URL || !VNP_RETURN_URL) {
    throw new Error("VNPay configuration is missing. Please set VNP_TMN_CODE, VNP_HASH_SECRET, VNP_PAYMENT_URL, VNP_RETURN_URL.");
  }

  return {
    tmnCode: VNP_TMN_CODE,
    hashSecret: VNP_HASH_SECRET,
    paymentUrl: VNP_PAYMENT_URL,
    returnUrl: VNP_RETURN_URL,
    ipnUrl: VNP_IPN_URL,
    locale: VNP_LOCALE || "vn",
    currCode: VNP_CURR_CODE || "VND"
  };
}

export interface BuildVNPayUrlParams {
  amount: number;
  orderInfo: string;
  ipAddr: string;
  orderId: string;
  bankCode?: string;
}

export interface VNPayPaymentUrlResult {
  url: string;
  vnp_TxnRef: string;
  vnp_ExpireDate: string;
}

/**
 * VNPay expects dates in Vietnam time (GMT+7) format: YYYYMMDDHHmmss.
 * Render containers often run in UTC, so we normalize to GMT+7 explicitly.
 */
function formatDateYYYYMMDDHHmmssGMT7(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  // shift to GMT+7, then read via UTC getters to avoid host timezone differences
  const d = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

export function buildVNPayPaymentUrl(params: BuildVNPayUrlParams): VNPayPaymentUrlResult {
  const config = getVNPayConfig();

  const createDate = new Date();
  const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000); // 15 minutes

  const vnp_TxnRef = params.orderId;

  const vnpParams: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(params.amount * 100), // VNPay uses smallest currency unit
    vnp_CurrCode: config.currCode || "VND",
    vnp_TxnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: config.locale || "vn",
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: params.ipAddr || "0.0.0.0",
    vnp_CreateDate: formatDateYYYYMMDDHHmmssGMT7(createDate),
    vnp_ExpireDate: formatDateYYYYMMDDHHmmssGMT7(expireDate)
  };

  if (config.ipnUrl) {
    vnpParams["vnp_NotifyUrl"] = config.ipnUrl;
  }

  if (params.bankCode) {
    vnpParams["vnp_BankCode"] = params.bankCode;
  }

  const sortedKeys = Object.keys(vnpParams).sort();
  const sortedParams: Record<string, string> = {};
  sortedKeys.forEach((key) => {
    sortedParams[key] = vnpParams[key];
  });

  const signData = querystring.stringify(sortedParams, undefined, undefined, {
    encodeURIComponent: (str) => encodeURIComponent(str).replace(/%20/g, "+")
  });

  const hmac = crypto.createHmac("sha512", config.hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const query = `${signData}&vnp_SecureHash=${secureHash}`;
  const url = `${config.paymentUrl}?${query}`;

  return {
    url,
    vnp_TxnRef,
    vnp_ExpireDate: vnpParams["vnp_ExpireDate"]
  };
}

export function verifyVNPayReturn(query: Record<string, any>): { isValid: boolean; vnp_ResponseCode?: string } {
  const config = getVNPayConfig();

  const vnpParams: Record<string, string> = {};
  Object.keys(query).forEach((key) => {
    if (key.startsWith("vnp_")) {
      vnpParams[key] = String(query[key]);
    }
  });

  const secureHash = vnpParams["vnp_SecureHash"];
  const secureHashType = vnpParams["vnp_SecureHashType"];
  delete vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHashType"];

  const sortedKeys = Object.keys(vnpParams).sort();
  const sortedParams: Record<string, string> = {};
  sortedKeys.forEach((key) => {
    sortedParams[key] = vnpParams[key];
  });

  const signData = querystring.stringify(sortedParams, undefined, undefined, {
    encodeURIComponent: (str) => encodeURIComponent(str).replace(/%20/g, "+")
  });

  const hmac = crypto.createHmac("sha512", config.hashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const isValid = secureHash?.toLowerCase() === signed.toLowerCase();
  return {
    isValid,
    vnp_ResponseCode: vnpParams["vnp_ResponseCode"]
  };
}

