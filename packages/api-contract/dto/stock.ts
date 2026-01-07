import { z } from 'zod';

// Stock DTOs - Example structure
// Replace with your actual stock schema

export const StockInDto = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  quantity: z.number().int().positive(),
  location: z.string().optional(),
});

export const StockOutDto = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

export type StockInDto = z.infer<typeof StockInDto>;
export type StockOutDto = z.infer<typeof StockOutDto>;

