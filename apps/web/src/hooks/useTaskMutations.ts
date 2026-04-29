'use client';

/**
 * TanStack Query mutation hooks for creating and updating tasks.
 *
 * - useCreateTask: pessimistic — waits for server response before updating cache
 * - useUpdateTask: optimistic — applies changes immediately, rolls back on error
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { Task } from '@kudo/schemas';
import { ApiClientError } from '@/lib/api-client';
import { createTask, updateTask, getTask } from '@/lib/api/tasks';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/api/tasks';
import { tasksKeys } from '@/hooks/useTasks';

// ---------------------------------------------------------------------------
// Single-task query key helper (mirrors list key factory pattern)
// ---------------------------------------------------------------------------

export const taskDetailKey = (id: string) => ['tasks', 'detail', id] as const;

// ---------------------------------------------------------------------------
// useTaskQuery — fetch a single task (used in edit mode)
// ---------------------------------------------------------------------------

export function useTaskQuery(id: string | undefined) {
  return useQuery<Task, ApiClientError>({
    queryKey: taskDetailKey(id ?? ''),
    queryFn: () => getTask(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// useCreateTask
// ---------------------------------------------------------------------------

export interface UseCreateTaskOptions {
  onSuccess?: (task: Task) => void;
  onError?: (error: ApiClientError) => void;
}

export function useCreateTask(options: UseCreateTaskOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Task, ApiClientError, CreateTaskInput>({
    mutationFn: (data) => createTask(data),

    // Pessimistic: invalidate list cache after server confirms creation
    onSuccess: (newTask) => {
      // Invalidate all task list queries so they refetch
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      // Seed the detail cache so edit mode opens instantly
      queryClient.setQueryData<Task>(taskDetailKey(newTask.id), newTask);
      options.onSuccess?.(newTask);
    },

    onError: (error) => {
      options.onError?.(error);
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateTask
// ---------------------------------------------------------------------------

export interface UpdateTaskVariables {
  id: string;
  data: UpdateTaskInput;
  updatedAt: string;
}

export interface UseUpdateTaskOptions {
  onSuccess?: (task: Task) => void;
  onError?: (error: ApiClientError) => void;
}

export function useUpdateTask(options: UseUpdateTaskOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<Task, ApiClientError, UpdateTaskVariables>({
    mutationFn: ({ id, data, updatedAt }) => updateTask(id, data, updatedAt),

    // Optimistic update: apply changes immediately to all caches
    onMutate: async ({ id, data }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: taskDetailKey(id) });
      await queryClient.cancelQueries({ queryKey: tasksKeys.all });

      // Snapshot previous values for rollback
      const previousDetail = queryClient.getQueryData<Task>(taskDetailKey(id));

      // Snapshot all list caches (the key includes params, so we grab what we can)
      const queryCache = queryClient.getQueryCache();
      const listQueries = queryCache
        .findAll({ queryKey: tasksKeys.all })
        .filter((q) => q.queryKey.includes('list'));

      const previousLists: Array<{ key: readonly unknown[]; data: unknown }> =
        listQueries.map((q) => ({ key: q.queryKey, data: q.state.data }));

      // Apply optimistic update to detail cache
      if (previousDetail) {
        queryClient.setQueryData<Task>(taskDetailKey(id), {
          ...previousDetail,
          ...data,
        });
      }

      // Apply optimistic update to every list query that contains this task
      for (const query of listQueries) {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const page = old as { items: Task[]; nextCursor: string | null };
          if (!Array.isArray(page.items)) return old;
          return {
            ...page,
            items: page.items.map((t) =>
              t.id === id ? { ...t, ...data } : t,
            ),
          };
        });
      }

      return { previousDetail, previousLists };
    },

    // Rollback on error
    onError: (error, { id }, context) => {
      const ctx = context as
        | {
            previousDetail?: Task;
            previousLists: Array<{ key: readonly unknown[]; data: unknown }>;
          }
        | undefined;

      if (ctx?.previousDetail !== undefined) {
        queryClient.setQueryData<Task>(taskDetailKey(id), ctx.previousDetail);
      }
      if (ctx?.previousLists) {
        for (const { key, data } of ctx.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }

      options.onError?.(error);
    },

    onSuccess: (updatedTask, { id }) => {
      // Reconcile cache with actual server response
      queryClient.setQueryData<Task>(taskDetailKey(id), updatedTask);
      options.onSuccess?.(updatedTask);
    },

    onSettled: (_data, _err, { id }) => {
      // Always re-sync from server after settle
      queryClient.invalidateQueries({ queryKey: taskDetailKey(id) });
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
