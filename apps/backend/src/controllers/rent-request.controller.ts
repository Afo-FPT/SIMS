import { Request, Response } from "express";
import {
  createRentRequest,
  getRentRequests,
  submitRentRequest,
  cancelRentRequest,
  updateRentRequestStatus,
} from "../services/rent-request.service";

export async function createRentRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customerId = req.user.userId;
    const data = req.body;

    const result = await createRentRequest(data, customerId);

    res.status(201).json({
      message: "Rent request created successfully",
      data: result,
    });
  } catch (error: any) {
    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("Invalid") ||
      error.message.includes("Only customers") ||
      error.message.includes("must be today or in the future")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function getRentRequestsController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.userId;
    const role = req.user.role;

    const requests = await getRentRequests(userId, role);

    res.json({
      message: "Rent requests retrieved successfully",
      data: requests,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function submitRentRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const customerId = req.user.userId;

    const result = await submitRentRequest(id, customerId);

    res.json({
      message: "Rent request submitted successfully",
      data: result,
    });
  } catch (error: any) {
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("only submit your own") ||
      error.message.includes("Only draft requests")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function cancelRentRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const customerId = req.user.userId;

    const result = await cancelRentRequest(id, customerId);

    res.json(result);
  } catch (error: any) {
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("only cancel your own") ||
      error.message.includes("cannot be cancelled")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

export async function updateRentRequestStatusController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status, rejectReason } = req.body;

    const result = await updateRentRequestStatus(id, status, rejectReason);

    res.json({
      message: "Rent request status updated successfully",
      data: result,
    });
  } catch (error: any) {
    if (
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("submitted requests")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
}

