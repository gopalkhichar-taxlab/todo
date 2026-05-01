/**
 * Typed API functions for the Strategies resource.
 * Wraps the shared `apiRequest` primitive with full TypeScript types
 * mirroring the API contract from the backend stories.
 */

import { apiRequest } from '@/lib/api-client';
import type { Strategy, CreateStrategy, UpdateStrategy, StrategyListStatus } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Re-export schema types so consumers don't need to reach into @kudo/schemas
// ---------------------------------------------------------------------------

export type { Strategy, CreateStrategy, UpdateStrategy, StrategyListStatus };

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
 * Uses StrategyListStatus type.
 *
 * GET /v1/strategies responds with a plain Strategy[] array (no pagination).
 */
export async function listStrategies(
  status: StrategyListStatus = 'active',
): Promise<Strategy[]> {
  return apiRequest<Strategy[]>(`/v1/strategies?status=${status}`);
}

/** Fetch a single strategy by ID. */
export async function getStrategy(id: string): Promise<Strategy> {
  return apiRequest<Strategy>(`/v1/strategies/${id}`);
}

/** Create a new strategy. Returns 201 + strategy DTO. */
export async function createStrategy(data: CreateStrategy): Promise<Strategy> {
  return apiRequest<Strategy>('/v1/strategies', {
    method: 'POST',
    body: data,
  });
}

/** Partially update a strategy (name, description, color, status). */
export async function updateStrategy(
  id: string,
  data: UpdateStrategy,
): Promise<Strategy> {
  return apiRequest<Strategy>(`/v1/strategies/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Soft-archive a strategy.
 * Calls DELETE /v1/strategies/:id — the API sets status=archived.
 */
export async function archiveStrategy(id: string): Promise<void> {
  await apiRequest<void>(`/v1/strategies/${id}`, { method: 'DELETE' });
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
 * Calls GET /v1/tasks?strategy_id=<id>&limit=100 which returns a paginated
 * envelope `{ items: TaskDTO[], nextCursor: string | null }` (TAL-83).
 * Paginates through all pages via nextCursor.
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
  let cursor: string | null = null;
  const allItems: TaskSummaryDTO[] = [];

  do {
    const url: string =
      `/v1/tasks?strategy_id=${strategyId}&limit=100` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
    const res: TasksPageResponse = await apiRequest<TasksPageResponse>(url);
    allItems.push(...(res.items ?? []));
    cursor = res.nextCursor ?? null;
  } while (cursor !== null);

  const activeCount = allItems.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  ).length;
  const completedCount = allItems.filter((t) => t.status === 'done').length;
  return {
    totalCount: activeCount + completedCount,
    activeCount,
    completedCount,
  };
}
