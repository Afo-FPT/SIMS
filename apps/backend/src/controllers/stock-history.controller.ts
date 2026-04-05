import { Request, Response } from "express";
import {
  getStockInHistory,
  getStockOutHistory,
  StockHistoryFilterParams
} from "../services/stock-history.service";

/**
 * Get stock-in history (inbound requests)
 * Authorization: Manager, Staff, Admin, Customer (only their own)
 */
export async function getStockInHistoryController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract query parameters
    const {
      contractId,
      customerId,
      status,
      startDate,
      endDate,
      page,
      limit
    } = req.query;

    // If user is customer, only show their own requests
    const filterCustomerId =
      req.user.role === "customer" ? req.user.userId : (customerId as string);

    // Prepare DTO
    const params: StockHistoryFilterParams = {
      contractId: contractId as string,
      customerId: filterCustomerId,
      status: status as
        | "PENDING"
        | "APPROVED"
        | "DONE_BY_STAFF"
        | "COMPLETED"
        | "REJECTED"
        | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    };

    // Get stock-in history
    const result = await getStockInHistory(params);

    // Return success response
    res.json({
      message: "Stock-in history retrieved successfully",
      data: result
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found")
    ) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}

/**
 * Get stock-out history (outbound requests)
 * Authorization: Manager, Staff, Admin, Customer (only their own)
 */
export async function getStockOutHistoryController(
  req: Request,
  res: Response
) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract query parameters
    const {
      contractId,
      customerId,
      status,
      startDate,
      endDate,
      page,
      limit
    } = req.query;

    // If user is customer, only show their own requests
    const filterCustomerId =
      req.user.role === "customer" ? req.user.userId : (customerId as string);

    // Prepare DTO
    const params: StockHistoryFilterParams = {
      contractId: contractId as string,
      customerId: filterCustomerId,
      status: status as
        | "PENDING"
        | "APPROVED"
        | "DONE_BY_STAFF"
        | "COMPLETED"
        | "REJECTED"
        | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    };

    // Get stock-out history
    const result = await getStockOutHistory(params);

    // Return success response
    res.json({
      message: "Stock-out history retrieved successfully",
      data: result
    });
  } catch (error: any) {
    // Handle validation errors
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found")
    ) {
      return res.status(400).json({ message: error.message });
    }

    // Handle other errors
    res.status(500).json({
      message: error.message || "Internal server error"
    });
  }
}
