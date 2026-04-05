import { z } from 'zod';

// Product DTOs - Example structure
// Replace with your actual product schema

export const ProductDto = z.object({
  id: z.string(),
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProductDto = ProductDto.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductDto = CreateProductDto.partial();

export type ProductDto = z.infer<typeof ProductDto>;
export type CreateProductDto = z.infer<typeof CreateProductDto>;
export type UpdateProductDto = z.infer<typeof UpdateProductDto>;

