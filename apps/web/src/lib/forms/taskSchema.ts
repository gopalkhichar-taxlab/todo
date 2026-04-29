/**
 * UI-specific form schema for the task create/edit dialog.
 *
 * The server schemas in @kudo/schemas use ISO datetime strings (with offset),
 * but HTML date inputs give us plain YYYY-MM-DD strings. This schema works
 * with those local values and adds the cross-field end_date >= start_date
 * validation that the UI needs.
 */
import { z } from 'zod';
import { TaskPrioritySchema, TaskStatusSchema } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Form field schema
// ---------------------------------------------------------------------------

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be 200 characters or fewer'),
    description: z.string().max(10_000).optional(),
    priority: TaskPrioritySchema.default('medium'),
    status: TaskStatusSchema.default('todo'),
    /** YYYY-MM-DD or empty string */
    start_date: z.string().optional(),
    /** YYYY-MM-DD or empty string */
    end_date: z.string().optional(),
    /** Strategy UUID or empty string (empty string → null on submit) */
    strategy_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'End date must be on or after the start date',
      });
    }
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;

// ---------------------------------------------------------------------------
// Helpers to convert form values → API payloads
// ---------------------------------------------------------------------------

/**
 * Convert a YYYY-MM-DD string from an HTML date input to an ISO-8601
 * datetime with UTC offset, or return null/undefined when the value is empty.
 */
function toIsoDate(value: string | undefined): string | null | undefined {
  if (!value || value.trim() === '') return null;
  // Append T00:00:00Z so the API receives a proper datetime-with-offset string
  return `${value}T00:00:00Z`;
}

export function formValuesToCreatePayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    priority: values.priority,
    status: values.status,
    strategy_id: values.strategy_id || null,
    start_date: toIsoDate(values.start_date),
    end_date: toIsoDate(values.end_date),
  };
}

export function formValuesToUpdatePayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description || undefined,
    priority: values.priority,
    status: values.status,
    strategy_id: values.strategy_id || null,
    start_date: toIsoDate(values.start_date),
    end_date: toIsoDate(values.end_date),
  };
}

/**
 * Convert an ISO-8601 datetime string (from API) to YYYY-MM-DD for HTML date inputs.
 */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  // Handles both '2024-03-15T00:00:00Z' and '2024-03-15T00:00:00+00:00'
  return iso.slice(0, 10);
}
