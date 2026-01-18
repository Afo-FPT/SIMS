import { z } from 'zod';

// Batch DTOs - Example structure
// Replace with your actual batch schema

export const BatchDto = z.object({
  id: z.string(),
  batchNumber: z.string().min(1),
  productId: z.string(),
  quantity: z.number().int().nonnegative(),
  expiryDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBatchDto = BatchDto.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateBatchDto = CreateBatchDto.partial();

export type BatchDto = z.infer<typeof BatchDto>;
export type CreateBatchDto = z.infer<typeof CreateBatchDto>;
export type UpdateBatchDto = z.infer<typeof UpdateBatchDto>;

