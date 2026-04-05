import { z } from 'zod';

// User DTOs - Example structure
// Replace with your actual user schema

export const UserDto = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'staff']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type UserDto = z.infer<typeof UserDto>;
export type LoginDto = z.infer<typeof LoginDto>;

