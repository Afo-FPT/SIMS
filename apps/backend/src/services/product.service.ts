import { Product } from "../models/product.model";

export const createProductService = async (data: {
  productName: string;
  description?: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
}) => {
  const exist = await Product.findOne({ productName: data.productName });
  if (exist) {
    throw new Error("PRODUCT_EXIST");
  }

  return await Product.create(data);
};

export default {
  createProductService,
};
