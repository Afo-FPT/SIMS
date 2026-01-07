import { Request, Response } from "express";
import { createProductService } from "../services/product.service";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await createProductService(req.body);

    return res.status(201).json({
      message: "Create product successfully",
      data: product,
    });
  } catch (error: any) {
    if (error.message === "PRODUCT_EXIST") {
      return res.status(400).json({ message: "Product already exists" });
    }

    return res.status(500).json({ message: "Server error" });
  }
};

export default {
  createProduct,
};
