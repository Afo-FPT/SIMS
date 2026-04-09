import SystemSetting from "../models/SystemSetting";

const SPACE_LIMITS_KEY = "space_limits";
const REQUEST_CREDIT_PRICING_KEY = "request_credit_pricing";
const WAREHOUSE_CREATION_TERMS_KEY = "warehouse_creation_terms";
const RENTAL_DRAFT_TERMS_KEY = "rental_draft_terms";

export interface SpaceLimitsDTO {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}

export interface RequestCreditPricingDTO {
  base_request_credit_price_vnd: number;
  expired_contract_penalty_per_day_vnd: number;
  weekly_free_request_limit: number;
}

export interface WarehouseCreationTermsDTO {
  warehouse_creation_terms: string;
}

export interface RentalDraftTermsDTO {
  rental_draft_terms_content: string;
  rental_draft_terms_agreement_label: string;
}

function normalizePercent(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > 100) {
    throw new Error(`${field} must be a number between 0 and 100`);
  }
  return Math.round(value * 100) / 100;
}

export async function getOrCreateSpaceLimits(): Promise<SpaceLimitsDTO> {
  let doc = await SystemSetting.findOne({ key: SPACE_LIMITS_KEY });
  if (!doc) {
    doc = await SystemSetting.create({
      key: SPACE_LIMITS_KEY,
      zoneAreaPercentOfWarehouse: 80,
      shelfAreaPercentOfZone: 80,
    });
  }
  return {
    zone_area_percent_of_warehouse: doc.zoneAreaPercentOfWarehouse,
    shelf_area_percent_of_zone: doc.shelfAreaPercentOfZone,
  };
}

export async function updateSpaceLimits(payload: {
  zone_area_percent_of_warehouse: number;
  shelf_area_percent_of_zone: number;
}): Promise<SpaceLimitsDTO> {
  const zonePct = normalizePercent(payload.zone_area_percent_of_warehouse, "zone_area_percent_of_warehouse");
  const shelfPct = normalizePercent(payload.shelf_area_percent_of_zone, "shelf_area_percent_of_zone");

  const doc = await SystemSetting.findOneAndUpdate(
    { key: SPACE_LIMITS_KEY },
    {
      $set: {
        zoneAreaPercentOfWarehouse: zonePct,
        shelfAreaPercentOfZone: shelfPct,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    zone_area_percent_of_warehouse: doc.zoneAreaPercentOfWarehouse,
    shelf_area_percent_of_zone: doc.shelfAreaPercentOfZone,
  };
}

function normalizeMoney(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a number >= 0`);
  }
  return Math.round(value);
}

export async function getOrCreateRequestCreditPricing(): Promise<RequestCreditPricingDTO> {
  let doc = await SystemSetting.findOne({ key: REQUEST_CREDIT_PRICING_KEY });
  if (!doc) {
    doc = await SystemSetting.create({
      key: REQUEST_CREDIT_PRICING_KEY,
      baseRequestCreditPriceVnd: 100000,
      expiredContractPenaltyPerDayVnd: 0,
    });
  }
  return {
    base_request_credit_price_vnd: doc.baseRequestCreditPriceVnd ?? 100000,
    expired_contract_penalty_per_day_vnd: doc.expiredContractPenaltyPerDayVnd ?? 0,
    weekly_free_request_limit: doc.weeklyFreeRequestLimit ?? 3,
  };
}

export async function updateRequestCreditPricing(payload: {
  base_request_credit_price_vnd: number;
  expired_contract_penalty_per_day_vnd: number;
  weekly_free_request_limit: number;
}): Promise<RequestCreditPricingDTO> {
  const base = normalizeMoney(payload.base_request_credit_price_vnd, "base_request_credit_price_vnd");
  const penalty = normalizeMoney(
    payload.expired_contract_penalty_per_day_vnd,
    "expired_contract_penalty_per_day_vnd"
  );
  const weeklyFree = normalizeMoney(payload.weekly_free_request_limit, "weekly_free_request_limit");

  const doc = await SystemSetting.findOneAndUpdate(
    { key: REQUEST_CREDIT_PRICING_KEY },
    {
      $set: {
        baseRequestCreditPriceVnd: base,
        expiredContractPenaltyPerDayVnd: penalty,
        weeklyFreeRequestLimit: weeklyFree,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    base_request_credit_price_vnd: doc.baseRequestCreditPriceVnd,
    expired_contract_penalty_per_day_vnd: doc.expiredContractPenaltyPerDayVnd,
    weekly_free_request_limit: doc.weeklyFreeRequestLimit,
  };
}

export async function getOrCreateWarehouseCreationTerms(): Promise<WarehouseCreationTermsDTO> {
  let doc = await SystemSetting.findOne({ key: WAREHOUSE_CREATION_TERMS_KEY });
  if (!doc) {
    doc = await SystemSetting.create({
      key: WAREHOUSE_CREATION_TERMS_KEY,
      warehouseCreationTerms:
        "By creating a warehouse, you confirm that all provided information is accurate and complies with system policies.",
    });
  }
  return {
    warehouse_creation_terms: (doc.warehouseCreationTerms || "").trim(),
  };
}

export async function updateWarehouseCreationTerms(payload: {
  warehouse_creation_terms: string;
}): Promise<WarehouseCreationTermsDTO> {
  const terms = String(payload.warehouse_creation_terms || "").trim();
  if (!terms) {
    throw new Error("warehouse_creation_terms is required");
  }
  if (terms.length > 5000) {
    throw new Error("warehouse_creation_terms must be <= 5000 characters");
  }

  const doc = await SystemSetting.findOneAndUpdate(
    { key: WAREHOUSE_CREATION_TERMS_KEY },
    {
      $set: {
        warehouseCreationTerms: terms,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    warehouse_creation_terms: (doc.warehouseCreationTerms || "").trim(),
  };
}

export async function getOrCreateRentalDraftTerms(): Promise<RentalDraftTermsDTO> {
  let doc = await SystemSetting.findOne({ key: RENTAL_DRAFT_TERMS_KEY });
  if (!doc) {
    doc = await SystemSetting.create({
      key: RENTAL_DRAFT_TERMS_KEY,
      rentalDraftTermsContent:
        "Please read and accept the terms below before creating a draft contract.\n\nEach contract includes up to 3 free service requests per week.\nIf free requests are used up, extra service requests may require additional payment based on system policy.\nIf a contract expires while goods are still in storage, overdue storage fees are charged daily.\nIf goods are not removed within 7 days after contract expiration, the system can mark goods for cancellation/disposal according to policy.\nService requests are processed based on warehouse capacity, zone availability, and operational schedule.\nSubmitting false, incomplete, or conflicting information can cause rejection or delay of requests.\nCustomers must follow warehouse safety, packaging, and prohibited-goods rules.\nSystem terms and pricing policies can be updated; the latest published policy applies.",
      rentalDraftTermsAgreementLabel: "I have read and agree to the rental terms and system rules.",
    });
  }
  return {
    rental_draft_terms_content: (doc.rentalDraftTermsContent || "").trim(),
    rental_draft_terms_agreement_label: (doc.rentalDraftTermsAgreementLabel || "").trim(),
  };
}

export async function updateRentalDraftTerms(payload: {
  rental_draft_terms_content: string;
  rental_draft_terms_agreement_label: string;
}): Promise<RentalDraftTermsDTO> {
  const content = String(payload.rental_draft_terms_content || "").trim();
  const agreementLabel = String(payload.rental_draft_terms_agreement_label || "").trim();
  if (!content) {
    throw new Error("rental_draft_terms_content is required");
  }
  if (!agreementLabel) {
    throw new Error("rental_draft_terms_agreement_label is required");
  }
  if (content.length > 10000) {
    throw new Error("rental_draft_terms_content must be <= 10000 characters");
  }
  if (agreementLabel.length > 500) {
    throw new Error("rental_draft_terms_agreement_label must be <= 500 characters");
  }

  const doc = await SystemSetting.findOneAndUpdate(
    { key: RENTAL_DRAFT_TERMS_KEY },
    {
      $set: {
        rentalDraftTermsContent: content,
        rentalDraftTermsAgreementLabel: agreementLabel,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    rental_draft_terms_content: (doc.rentalDraftTermsContent || "").trim(),
    rental_draft_terms_agreement_label: (doc.rentalDraftTermsAgreementLabel || "").trim(),
  };
}
