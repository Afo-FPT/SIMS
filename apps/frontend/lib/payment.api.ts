import { apiJson } from './api-client';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

export interface ManagerContractPayment {
  id: string;
  contractId: string;
  contractCode?: string;
  contractStatus?: string;
  customerName?: string;
  warehouseName?: string;
  amount: number;
  status: PaymentStatus;
  gateway: 'vnpay';
  vnpTxnRef: string;
  vnpResponseCode?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface ManagerServicePayment {
  id: string;
  contractId: string;
  contractCode?: string;
  contractStatus?: string;
  customerId: string;
  customerName?: string;
  warehouseName?: string;
  creditsGranted: number;
  amount: number;
  status: PaymentStatus;
  gateway: 'vnpay';
  vnpTxnRef: string;
  vnpResponseCode?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface BackendPayment {
  _id: string;
  contractId:
    | string
    | {
        _id: string;
        contractCode?: string;
        status?: string;
        customerId?: { name?: string } | string;
        warehouseId?: { name?: string } | string;
      };
  amount: number;
  status: PaymentStatus;
  gateway: 'vnpay';
  vnpTxnRef: string;
  vnpOrderInfo: string;
  vnpResponseCode?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface BackendRequestCreditPayment {
  _id: string;
  customerId: string | { _id: string; name?: string };
  contractId:
    | string
    | {
        _id: string;
        contractCode?: string;
        status?: string;
        warehouseId?: { name?: string } | string;
      };
  creditsGranted: number;
  amount: number;
  status: PaymentStatus;
  gateway: 'vnpay';
  vnpTxnRef: string;
  vnpResponseCode?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface BackendManagerPaymentsResponse {
  contractPayments: BackendPayment[];
  servicePayments: BackendRequestCreditPayment[];
}

export interface ManagerPaymentsResponse {
  contractPayments: ManagerContractPayment[];
  servicePayments: ManagerServicePayment[];
}

function mapBackendPayment(p: BackendPayment): ManagerContractPayment {
  const contract = typeof p.contractId === 'string' ? undefined : p.contractId;
  let customerName: string | undefined;
  let warehouseName: string | undefined;

  if (contract) {
    const customer = contract.customerId as any;
    const warehouse = contract.warehouseId as any;
    if (customer && typeof customer === 'object') {
      customerName = customer.name;
    }
    if (warehouse && typeof warehouse === 'object') {
      warehouseName = warehouse.name;
    }
  }

  return {
    id: p._id,
    contractId: (typeof p.contractId === 'string' ? p.contractId : p.contractId?._id) as string,
    contractCode: contract?.contractCode,
    contractStatus: contract?.status,
    customerName,
    warehouseName,
    amount: p.amount,
    status: p.status,
    gateway: p.gateway,
    vnpTxnRef: p.vnpTxnRef,
    vnpResponseCode: p.vnpResponseCode,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    paidAt: p.paidAt,
  };
}

function mapBackendRequestCreditPayment(p: BackendRequestCreditPayment): ManagerServicePayment {
  const contract = typeof p.contractId === 'string' ? undefined : p.contractId;
  const customer = typeof p.customerId === 'string' ? undefined : p.customerId;
  const warehouse = contract?.warehouseId as any;

  return {
    id: p._id,
    contractId: (typeof p.contractId === 'string' ? p.contractId : p.contractId?._id) as string,
    contractCode: contract?.contractCode,
    contractStatus: contract?.status,
    customerId: (typeof p.customerId === 'string' ? p.customerId : p.customerId?._id) as string,
    customerName: customer?.name,
    warehouseName: warehouse && typeof warehouse === 'object' ? warehouse.name : undefined,
    creditsGranted: p.creditsGranted,
    amount: p.amount,
    status: p.status,
    gateway: p.gateway,
    vnpTxnRef: p.vnpTxnRef,
    vnpResponseCode: p.vnpResponseCode,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    paidAt: p.paidAt,
  };
}

export interface StartPaymentResponse {
  paymentId: string;
  contractId: string;
  amount: number;
  status: PaymentStatus;
  paymentUrl: string;
  expireAt: string;
}

export async function startContractVNPayPayment(contractId: string): Promise<StartPaymentResponse> {
  const data = await apiJson<StartPaymentResponse>(`/payments/contracts/${contractId}/vnpay/start`, {
    method: 'POST',
  });
  return data;
}

export interface StartRequestCreditPaymentResponse {
  paymentId: string;
  customerId: string;
  amount: number;
  status: PaymentStatus;
  paymentUrl: string;
  expireAt: string;
}

export interface RequestCreditSummaryResponse {
  weekly_free_limit: number;
  completed_count: number;
  unfinished_count: number;
  total_used: number;
  remaining_free_requests: number;
  requires_extra_credit: boolean;
}

export async function startRequestCreditVNPayPayment(contractId: string): Promise<StartRequestCreditPaymentResponse> {
  const data = await apiJson<StartRequestCreditPaymentResponse>(
    `/payments/request-credits/vnpay/start`,
    {
      method: 'POST',
      body: JSON.stringify({ contractId }),
    }
  );
  return data;
}

export async function getRequestCreditSummary(contractId: string): Promise<RequestCreditSummaryResponse> {
  const qs = new URLSearchParams({ contractId });
  const data = await apiJson<RequestCreditSummaryResponse>(
    `/payments/request-credits/summary?${qs.toString()}`,
    { method: 'GET' }
  );
  return data;
}

export async function listManagerPayments(): Promise<ManagerPaymentsResponse> {
  const data = await apiJson<BackendManagerPaymentsResponse>('/payments', {
    method: 'GET',
  });
  return {
    contractPayments: data.contractPayments.map(mapBackendPayment),
    servicePayments: data.servicePayments.map(mapBackendRequestCreditPayment),
  };
}

