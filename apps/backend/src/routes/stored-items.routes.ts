import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware";
import { getMyStoredItemsController, getMyStoredProductsController, getMyStoredProductShelvesController } from "../controllers/stored-item.controller";

const router = Router();

router.get("/my", authenticate, authorizeRoles("customer"), getMyStoredItemsController);
router.get("/my/products", authenticate, authorizeRoles("customer"), getMyStoredProductsController);
router.get("/my/products/:sku", authenticate, authorizeRoles("customer"), getMyStoredProductShelvesController);

export default router;

