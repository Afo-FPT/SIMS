import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import {
  getRentalDraftTermsController,
  getWarehouseCreationTermsController,
  getRequestCreditPricingController,
  getSpaceLimitsController,
  updateRentalDraftTermsController,
  updateRequestCreditPricingController,
  updateSpaceLimitsController,
  updateWarehouseCreationTermsController
} from "../controllers/system-setting.controller";

const router = Router();

router.get("/space-limits", authenticate, authorizeRoles("manager", "admin"), getSpaceLimitsController);
router.patch("/space-limits", authenticate, authorizeRoles("admin"), updateSpaceLimitsController);
router.get("/request-credit-pricing", authenticate, authorizeRoles("manager", "admin"), getRequestCreditPricingController);
router.patch("/request-credit-pricing", authenticate, authorizeRoles("admin"), updateRequestCreditPricingController);
router.get("/warehouse-creation-terms", authenticate, authorizeRoles("manager", "admin"), getWarehouseCreationTermsController);
router.patch("/warehouse-creation-terms", authenticate, authorizeRoles("admin"), updateWarehouseCreationTermsController);
router.get("/rental-draft-terms", authenticate, authorizeRoles("customer", "manager", "admin"), getRentalDraftTermsController);
router.patch("/rental-draft-terms", authenticate, authorizeRoles("admin"), updateRentalDraftTermsController);

export default router;
