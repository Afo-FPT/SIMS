import { apiJson } from './api-client';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

export interface ManagerPayment {
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

function mapBackendPayment(p: BackendPayment): ManagerPayment {
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

export async function startRequestCreditVNPayPayment(): Promise<StartRequestCreditPaymentResponse> {
  const data = await apiJson<StartRequestCreditPaymentResponse>(
    `/payments/request-credits/vnpay/start`,
    {
      method: 'POST',
    }
  );
  return data;
}

export async function listManagerPayments(): Promise<ManagerPayment[]> {
  const data = await apiJson<BackendPayment[]>('/payments', {
    method: 'GET',
  });
  return data.map(mapBackendPayment);
}

