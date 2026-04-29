import { z } from 'zod';
import { IdSchema, TimestampSchema, PaginationQuerySchema } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSortFieldSchema = z.enum(['priority', 'due', 'sort_order', 'created_at']);
export type TaskSortField = z.infer<typeof TaskSortFieldSchema>;

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// ---------------------------------------------------------------------------
// Task DTO
// ---------------------------------------------------------------------------

export const TaskSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  strategy_id: IdSchema.nullable(),
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).nullable(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  start_date: z.string().datetime({ offset: true }).nullable(),
  end_date: z.string().datetime({ offset: true }).nullable(),
  sort_order: z.number().int(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  deleted_at: TimestampSchema.nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// Create / Update payloads
// ---------------------------------------------------------------------------

export const CreateTaskSchema = z.object({
  strategy_id: IdSchema.nullable().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(10_000).optional(),
  priority: TaskPrioritySchema.default('medium'),
  status: TaskStatusSchema.default('todo'),
  start_date: z.string().datetime({ offset: true }).nullable().optional(),
  end_date: z.string().datetime({ offset: true }).nullable().optional(),
  sort_order: z.number().int().optional(),
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial();
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

// ---------------------------------------------------------------------------
// List query params  (TAL-83)
// ---------------------------------------------------------------------------

export const ListTasksQuerySchema = PaginationQuerySchema.extend({
  strategy_id: IdSchema.optional(),
  /** Comma-separated status values e.g. "todo,in_progress" */
  status: z
    .string()
    .optional()
    .transform((v) =>
      v ? (v.split(',').filter(Boolean) as TaskStatus[]) : undefined,
    )
    .pipe(z.array(TaskStatusSchema).optional()),
  /** Comma-separated priority values e.g. "high,critical" */
  priority: z
    .string()
    .optional()
    .transform((v) =>
      v ? (v.split(',').filter(Boolean) as TaskPriority[]) : undefined,
    )
    .pipe(z.array(TaskPrioritySchema).optional()),
  /** ISO date — include tasks where start_date >= from */
  from: z.string().datetime({ offset: true }).optional(),
  /** ISO date — include tasks where end_date <= to */
  to: z.string().datetime({ offset: true }).optional(),
  /** Substring search on title and description */
  q: z.string().max(200).optional(),
  sort: TaskSortFieldSchema.default('sort_order'),
  order: SortOrderSchema.default('asc'),
});
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
