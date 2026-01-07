import { z } from 'zod';

// Common DTOs used across the application

export const PaginationDto = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const PaginationResponseDto = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type PaginationDto = z.infer<typeof PaginationDto>;
export type PaginationResponseDto = z.infer<typeof PaginationResponseDto>;

