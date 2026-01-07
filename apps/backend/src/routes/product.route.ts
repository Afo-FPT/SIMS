import { Router } from "express";
import { createProduct } from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";


const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  createProduct
);

export default router;
