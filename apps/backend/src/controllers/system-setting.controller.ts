import { Request, Response } from "express";
import {
  getOrCreateWarehouseCreationTerms,
  getOrCreateRentalDraftTerms,
  getOrCreateRequestCreditPricing,
  getOrCreateSpaceLimits,
  updateRentalDraftTerms,
  updateRequestCreditPricing,
  updateSpaceLimits,
  updateWarehouseCreationTerms
} from "../services/system-setting.service";

export async function getSpaceLimitsController(_req: Request, res: Response) {
  try {
    const data = await getOrCreateSpaceLimits();
    return res.json({ message: "Space limits retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function updateSpaceLimitsController(req: Request, res: Response) {
  try {
    const zone = Number(req.body?.zone_area_percent_of_warehouse);
    const shelf = Number(req.body?.shelf_area_percent_of_zone);
    const data = await updateSpaceLimits({
      zone_area_percent_of_warehouse: zone,
      shelf_area_percent_of_zone: shelf,
    });
    return res.json({ message: "Space limits updated successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("must be a number")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

export async function getRequestCreditPricingController(_req: Request, res: Response) {
  try {
    const data = await getOrCreateRequestCreditPricing();
    return res.json({ message: "Request-credit pricing retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function updateRequestCreditPricingController(req: Request, res: Response) {
  try {
    const base = Number(req.body?.base_request_credit_price_vnd);
    const penalty = Number(req.body?.expired_contract_penalty_per_day_vnd);
    const weeklyFree = Number(req.body?.weekly_free_request_limit);
    const data = await updateRequestCreditPricing({
      base_request_credit_price_vnd: base,
      expired_contract_penalty_per_day_vnd: penalty,
      weekly_free_request_limit: weeklyFree,
    });
    return res.json({ message: "Request-credit pricing updated successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("must be a number")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

export async function getWarehouseCreationTermsController(_req: Request, res: Response) {
  try {
    const data = await getOrCreateWarehouseCreationTerms();
    return res.json({ message: "Warehouse creation terms retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function updateWarehouseCreationTermsController(req: Request, res: Response) {
  try {
    const terms = String(req.body?.warehouse_creation_terms ?? "");
    const data = await updateWarehouseCreationTerms({
      warehouse_creation_terms: terms,
    });
    return res.json({ message: "Warehouse creation terms updated successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (msg.includes("required") || msg.includes("<= 5000")) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}

export async function getRentalDraftTermsController(_req: Request, res: Response) {
  try {
    const data = await getOrCreateRentalDraftTerms();
    return res.json({ message: "Rental draft terms retrieved successfully", data });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Internal server error" });
  }
}

export async function updateRentalDraftTermsController(req: Request, res: Response) {
  try {
    const content = String(req.body?.rental_draft_terms_content ?? "");
    const agreementLabel = String(req.body?.rental_draft_terms_agreement_label ?? "");
    const data = await updateRentalDraftTerms({
      rental_draft_terms_content: content,
      rental_draft_terms_agreement_label: agreementLabel,
    });
    return res.json({ message: "Rental draft terms updated successfully", data });
  } catch (error: any) {
    const msg = error?.message || "Internal server error";
    if (
      msg.includes("required") ||
      msg.includes("<= 10000") ||
      msg.includes("<= 500")
    ) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
}
