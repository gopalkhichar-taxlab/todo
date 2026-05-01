/**
 * Typed API functions for the Strategies resource.
 * Wraps the shared `apiRequest` primitive with full TypeScript types
 * mirroring the API contract from the backend stories.
 */

import { apiRequest } from '@/lib/api-client';
import type { Strategy, CreateStrategy, UpdateStrategy } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Re-export schema types so consumers don't need to reach into @kudo/schemas
// ---------------------------------------------------------------------------

export type { Strategy, CreateStrategy, UpdateStrategy };
export type StrategyStatus = 'active' | 'archived';

// ---------------------------------------------------------------------------
// Task count shape
// ---------------------------------------------------------------------------

export interface TaskCountDTO {
  totalCount: number;
  activeCount: number;
  completedCount: number;
}

/**
 * Minimal Task DTO used only for computing counts.
 * Matches the `status` field from TAL-83's TaskSchema:
 *   z.enum(['todo', 'in_progress', 'done', 'cancelled'])
 */
type TaskStatusValue = 'todo' | 'in_progress' | 'done' | 'cancelled';

interface TaskSummaryDTO {
  status: TaskStatusValue;
}

/** GET /tasks returns a cursor-paginated envelope. */
interface TasksPageResponse {
  items: TaskSummaryDTO[];
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all strategies for the current user.
 * Optionally filter by status: 'active' (default) | 'archived' | 'all'.
 *
 * GET /v1/strategies responds with a plain Strategy[] array (no pagination).
 */
export async function listStrategies(
  status: 'active' | 'archived' | 'all' = 'active',
): Promise<Strategy[]> {
  return apiRequest<Strategy[]>(`/strategies?status=${status}`);
}

/** Fetch a single strategy by ID. */
export async function getStrategy(id: string): Promise<Strategy> {
  return apiRequest<Strategy>(`/strategies/${id}`);
}

/** Create a new strategy. Returns 201 + strategy DTO. */
export async function createStrategy(data: CreateStrategy): Promise<Strategy> {
  return apiRequest<Strategy>('/strategies', {
    method: 'POST',
    body: data,
  });
}

/** Partially update a strategy (name, description, color, status). */
export async function updateStrategy(
  id: string,
  data: UpdateStrategy,
): Promise<Strategy> {
  return apiRequest<Strategy>(`/strategies/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Soft-archive a strategy.
 * Calls DELETE /strategies/:id — the API sets status=archived.
 */
export async function archiveStrategy(id: string): Promise<void> {
  await apiRequest<void>(`/strategies/${id}`, { method: 'DELETE' });
}

/**
 * Restore an archived strategy by patching status back to active.
 */
export async function restoreStrategy(id: string): Promise<Strategy> {
  return updateStrategy(id, { status: 'active' });
}

/**
 * Fetch task counts for a given strategy.
 *
 * Calls GET /tasks?strategy_id=<id>&limit=100 which returns a paginated
 * envelope `{ items: TaskDTO[], nextCursor: string | null }` (TAL-83).
 * Counts are derived client-side from the items' `status` field:
 *   - active    = todo | in_progress
 *   - completed = done
 *   - total     = active + completed (excludes cancelled)
 *
 * Errors are propagated so TanStack Query can retry / surface error state.
 */
export async function getTaskCountsForStrategy(
  strategyId: string,
): Promise<TaskCountDTO> {
  const res = await apiRequest<TasksPageResponse>(
    `/tasks?strategy_id=${strategyId}&limit=100`,
  );
  const items = res.items ?? [];
  const activeCount = items.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  ).length;
  const completedCount = items.filter((t) => t.status === 'done').length;
  return {
    totalCount: activeCount + completedCount,
    activeCount,
    completedCount,
  };
}
