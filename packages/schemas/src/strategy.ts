import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const StrategyStatusSchema = z.enum(['active', 'archived']);
export type StrategyStatus = z.infer<typeof StrategyStatusSchema>;

// ---------------------------------------------------------------------------
// Strategy DTO
// ---------------------------------------------------------------------------

export const StrategySchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(5_000).nullable(),
  /** Hex color string, e.g. "#3B82F6" */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .default('#3B82F6'),
  status: StrategyStatusSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});
export type Strategy = z.infer<typeof StrategySchema>;

// ---------------------------------------------------------------------------
// Create / Update payloads
// ---------------------------------------------------------------------------

export const CreateStrategySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5_000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .default('#3B82F6'),
  status: StrategyStatusSchema.default('active'),
});
export type CreateStrategy = z.infer<typeof CreateStrategySchema>;

export const UpdateStrategySchema = CreateStrategySchema.partial();
export type UpdateStrategy = z.infer<typeof UpdateStrategySchema>;
