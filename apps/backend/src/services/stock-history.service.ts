import { Types } from "mongoose";
import StorageRequest from "../models/StorageRequest";
import StorageRequestDetail from "../models/StorageRequestDetail";

/**
 * DTO for stock history item
 */
export interface StockHistoryItem {
  request_id: string;
  contract_id: string;
  customer_id: string;
  customer_name?: string;
  request_type: "IN" | "OUT";
  status: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  items: {
    request_detail_id: string;
    shelf_id: string;
    shelf_code?: string;
    item_name: string;
    quantity_requested: number;
    quantity_actual?: number;
    unit: string;
  }[];
  approved_by?: string;
  approved_at?: Date;
  customer_confirmed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * DTO for paginated stock history response
 */
export interface PaginatedStockHistoryResponse {
  history: StockHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * DTO for filter parameters
 */
export interface StockHistoryFilterParams {
  contractId?: string;
  customerId?: string;
  status?: "PENDING" | "APPROVED" | "DONE_BY_STAFF" | "COMPLETED" | "REJECTED";
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Get stock-in history (inbound requests)
 */
export async function getStockInHistory(
  params: StockHistoryFilterParams
): Promise<PaginatedStockHistoryResponse> {
  const {
    contractId,
    customerId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = params;

  // Build query
  const query: any = {
    requestType: "IN"
  };

  if (contractId) {
    if (!Types.ObjectId.isValid(contractId)) {
      throw new Error("Invalid contract ID");
    }
    query.contractId = new Types.ObjectId(contractId);
  }

  if (customerId) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new Error("Invalid customer ID");
    }
    query.customerId = new Types.ObjectId(customerId);
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Validate pagination
  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNumber - 1) * limitNumber;

  // Execute query with pagination
  const [requests, total] = await Promise.all([
    StorageRequest.find(query)
      .populate("customerId", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    StorageRequest.countDocuments(query)
  ]);

  // Get request details for each request
  const historyItems: StockHistoryItem[] = await Promise.all(
    requests.map(async (request) => {
      const details = await StorageRequestDetail.find({
        requestId: request._id
      }).populate("shelfId", "shelfCode");

      return {
        request_id: request._id.toString(),
        contract_id: request.contractId.toString(),
        customer_id: request.customerId.toString(),
        customer_name:
          typeof request.customerId === "object" && "name" in request.customerId
            ? (request.customerId as any).name
            : undefined,
        request_type: request.requestType,
        status: request.status,
        items: details.map((detail) => ({
          request_detail_id: detail._id.toString(),
          shelf_id: detail.shelfId.toString(),
          shelf_code:
            typeof detail.shelfId === "object" && "shelfCode" in detail.shelfId
              ? (detail.shelfId as any).shelfCode
              : undefined,
          item_name: detail.itemName,
          quantity_requested: detail.quantityRequested,
          quantity_actual: detail.quantityActual,
          unit: detail.unit
        })),
        approved_by:
          request.approvedBy && typeof request.approvedBy === "object" && "name" in request.approvedBy
            ? (request.approvedBy as any).name
            : request.approvedBy?.toString(),
        approved_at: request.approvedAt,
        customer_confirmed_at: request.customerConfirmedAt,
        created_at: request.createdAt,
        updated_at: request.updatedAt
      };
    })
  );

  return {
    history: historyItems,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  };
}

/**
 * Get stock-out history (outbound requests)
 */
export async function getStockOutHistory(
  params: StockHistoryFilterParams
): Promise<PaginatedStockHistoryResponse> {
  const {
    contractId,
    customerId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = params;

  // Build query
  const query: any = {
    requestType: "OUT"
  };

  if (contractId) {
    if (!Types.ObjectId.isValid(contractId)) {
      throw new Error("Invalid contract ID");
    }
    query.contractId = new Types.ObjectId(contractId);
  }

  if (customerId) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new Error("Invalid customer ID");
    }
    query.customerId = new Types.ObjectId(customerId);
  }

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  // Validate pagination
  const pageNumber = Math.max(1, Number(page) || 1);
  const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNumber - 1) * limitNumber;

  // Execute query with pagination
  const [requests, total] = await Promise.all([
    StorageRequest.find(query)
      .populate("customerId", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    StorageRequest.countDocuments(query)
  ]);

  // Get request details for each request
  const historyItems: StockHistoryItem[] = await Promise.all(
    requests.map(async (request) => {
      const details = await StorageRequestDetail.find({
        requestId: request._id
      }).populate("shelfId", "shelfCode");

      return {
        request_id: request._id.toString(),
        contract_id: request.contractId.toString(),
        customer_id: request.customerId.toString(),
        customer_name:
          typeof request.customerId === "object" && "name" in request.customerId
            ? (request.customerId as any).name
            : undefined,
        request_type: request.requestType,
        status: request.status,
        items: details.map((detail) => ({
          request_detail_id: detail._id.toString(),
          shelf_id: detail.shelfId.toString(),
          shelf_code:
            typeof detail.shelfId === "object" && "shelfCode" in detail.shelfId
              ? (detail.shelfId as any).shelfCode
              : undefined,
          item_name: detail.itemName,
          quantity_requested: detail.quantityRequested,
          quantity_actual: detail.quantityActual,
          unit: detail.unit
        })),
        approved_by:
          request.approvedBy && typeof request.approvedBy === "object" && "name" in request.approvedBy
            ? (request.approvedBy as any).name
            : request.approvedBy?.toString(),
        approved_at: request.approvedAt,
        customer_confirmed_at: request.customerConfirmedAt,
        created_at: request.createdAt,
        updated_at: request.updatedAt
      };
    })
  );

  return {
    history: historyItems,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  };
}
