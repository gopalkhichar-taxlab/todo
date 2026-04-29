import { apiRequest } from '@/lib/api-client';
import type { Task, CreateTask, UpdateTask } from '@kudo/schemas';

// Re-export for consumers
export type { CreateTask as CreateTaskInput, UpdateTask as UpdateTaskInput };

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

/**
 * Create a new task.
 * Returns the created task DTO.
 */
export async function createTask(data: CreateTask): Promise<Task> {
  return apiRequest<Task>('/tasks', {
    method: 'POST',
    body: data,
  });
}

/**
 * Partially update a task.
 * Sends If-Match header with the task's current updated_at value to detect
 * concurrent edits. The API returns 412 if the resource has been updated
 * by another client since the snapshot was taken.
 */
export async function updateTask(
  id: string,
  data: UpdateTask,
  updatedAt: string,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: data,
    headers: {
      'If-Match': updatedAt,
    },
  });
}

/**
 * Soft-delete a task. The API sets deleted_at and returns 204.
 */
export async function deleteTask(id: string): Promise<void> {
  return apiRequest<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Restore a soft-deleted task within 30 days.
 * Returns the restored task DTO.
 */
export async function restoreTask(id: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}/restore`, {
    method: 'POST',
  });
}
