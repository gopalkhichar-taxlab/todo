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
// List / page shapes
// ---------------------------------------------------------------------------

export interface StrategiesPage {
  items: Strategy[];
  nextCursor: string | null;
}

type ListStrategiesResponse =
  | Strategy[]
  | { items: Strategy[]; nextCursor: string | null }
  | { data: Strategy[]; total: number };

// ---------------------------------------------------------------------------
// Task count shape
// ---------------------------------------------------------------------------

export interface TaskCountDTO {
  totalCount: number;
  activeCount: number;
  completedCount: number;
}

interface TasksListResponse {
  items?: unknown[];
  data?: unknown[];
  totalCount?: number;
  total?: number;
  activeCount?: number;
  completedCount?: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all strategies for the current user.
 * Optionally filter by status: 'active' (default) | 'archived' | 'all'.
 */
export async function listStrategies(
  status: 'active' | 'archived' | 'all' = 'active',
): Promise<Strategy[]> {
  const res = await apiRequest<ListStrategiesResponse>(
    `/strategies?status=${status}`,
  );
  if (Array.isArray(res)) return res;
  if ('items' in res) return res.items;
  if ('data' in res) return res.data;
  return [];
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
 * Uses GET /tasks?strategy_id=<id>&limit=0 and reads counts from the response.
 */
export async function getTaskCountsForStrategy(
  strategyId: string,
): Promise<TaskCountDTO> {
  try {
    const res = await apiRequest<TasksListResponse>(
      `/tasks?strategy_id=${strategyId}&limit=0`,
    );
    return {
      totalCount: res.totalCount ?? res.total ?? 0,
      activeCount: res.activeCount ?? 0,
      completedCount: res.completedCount ?? 0,
    };
  } catch {
    return { totalCount: 0, activeCount: 0, completedCount: 0 };
  }
}
