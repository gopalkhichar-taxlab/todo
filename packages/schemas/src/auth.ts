import { z } from 'zod';

export const SignupBodySchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});
export type SignupBody = z.infer<typeof SignupBodySchema>;

export const LoginBodySchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const UserDtoSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});
export type UserDto = z.infer<typeof UserDtoSchema>;

export const AuthResponseSchema = z.object({
  user: UserDtoSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
