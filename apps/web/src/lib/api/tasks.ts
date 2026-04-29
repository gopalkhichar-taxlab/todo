import { apiRequest } from '@/lib/api-client';
import type { Task } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TasksPage {
  items: Task[];
  nextCursor: string | null;
}

export interface ListTasksParams {
  strategy_id?: string;
  status?: string; // comma-separated
  priority?: string; // comma-separated
  from?: string;
  to?: string;
  q?: string;
  sort?: string;
  order?: string;
  cursor?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQueryString(params: ListTasksParams): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '' && v !== null,
  ) as [string, string | number][];

  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of tasks. Applies all filter / sort / search params.
 */
export async function listTasks(params: ListTasksParams = {}): Promise<TasksPage> {
  const qs = buildQueryString({ limit: 50, ...params });
  return apiRequest<TasksPage>(`/tasks${qs}`);
}

/**
 * Fetch a single task by ID.
 */
export async function getTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`);
}
