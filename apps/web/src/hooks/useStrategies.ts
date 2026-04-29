'use client';

/**
 * TanStack Query hooks for the Strategies resource.
 *
 * Provides query + mutation hooks with optimistic updates and cache management.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ApiClientError } from '@/lib/api-client';
import {
  listStrategies,
  getStrategy,
  createStrategy,
  updateStrategy,
  archiveStrategy,
  restoreStrategy,
  getTaskCountsForStrategy,
  type Strategy,
  type CreateStrategy,
  type UpdateStrategy,
  type TaskCountDTO,
} from '@/lib/api/strategies';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const strategiesKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategiesKeys.all, 'list'] as const,
  list: (status: string) => [...strategiesKeys.lists(), { status }] as const,
  detail: (id: string) => [...strategiesKeys.all, 'detail', id] as const,
  taskCounts: (id: string) =>
    [...strategiesKeys.all, 'taskCounts', id] as const,
} as const;

// ---------------------------------------------------------------------------
// List query
// ---------------------------------------------------------------------------

export interface UseStrategiesQueryOptions {
  status?: 'active' | 'archived' | 'all';
  enabled?: boolean;
}

/**
 * Fetch the list of strategies, optionally filtered by status.
 * Redirects to /login on 401.
 */
export function useStrategiesQuery(options: UseStrategiesQueryOptions = {}) {
  const { status = 'active', enabled = true } = options;
  const router = useRouter();

  const query = useQuery<Strategy[], Error>({
    queryKey: strategiesKeys.list(status),
    queryFn: () => listStrategies(status),
    staleTime: 30_000,
    enabled,
  });

  useEffect(() => {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      router.replace('/login');
    }
  }, [query.error, router]);

  return query;
}

// ---------------------------------------------------------------------------
// Single strategy query
// ---------------------------------------------------------------------------

export function useStrategyQuery(id: string) {
  return useQuery<Strategy, Error>({
    queryKey: strategiesKeys.detail(id),
    queryFn: () => getStrategy(id),
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// Task counts query
// ---------------------------------------------------------------------------

export function useStrategyTaskCountsQuery(strategyId: string) {
  return useQuery<TaskCountDTO, Error>({
    queryKey: strategiesKeys.taskCounts(strategyId),
    queryFn: () => getTaskCountsForStrategy(strategyId),
    staleTime: 60_000,
    enabled: Boolean(strategyId),
  });
}

// ---------------------------------------------------------------------------
// Create mutation
// ---------------------------------------------------------------------------

export function useCreateStrategyMutation() {
  const queryClient = useQueryClient();

  return useMutation<Strategy, ApiClientError, CreateStrategy>({
    mutationFn: createStrategy,
    onSuccess: (newStrategy) => {
      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('active'),
        (prev = []) => [newStrategy, ...prev],
      );
      queryClient.invalidateQueries({
        queryKey: strategiesKeys.list('all') as QueryKey,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Update mutation
// ---------------------------------------------------------------------------

export interface UpdateStrategyVariables {
  id: string;
  data: UpdateStrategy;
}

export function useUpdateStrategyMutation() {
  const queryClient = useQueryClient();

  return useMutation<Strategy, ApiClientError, UpdateStrategyVariables>({
    mutationFn: ({ id, data }) => updateStrategy(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: strategiesKeys.detail(id) });

      const previousActive = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('active'),
      );
      const previousAll = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('all'),
      );
      const previousDetail = queryClient.getQueryData<Strategy>(
        strategiesKeys.detail(id),
      );

      const applyUpdate = (prev: Strategy[] = []): Strategy[] =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s));

      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('active'),
        applyUpdate,
      );
      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('all'),
        applyUpdate,
      );
      queryClient.setQueryData<Strategy>(
        strategiesKeys.detail(id),
        (prev: Strategy | undefined) => (prev ? { ...prev, ...data } : prev),
      );

      return { previousActive, previousAll, previousDetail };
    },

    onError: (_err, { id }, context) => {
      const ctx = context as
        | {
            previousActive?: Strategy[];
            previousAll?: Strategy[];
            previousDetail?: Strategy;
          }
        | undefined;
      if (!ctx) return;

      if (ctx.previousActive !== undefined) {
        queryClient.setQueryData(
          strategiesKeys.list('active'),
          ctx.previousActive,
        );
      }
      if (ctx.previousAll !== undefined) {
        queryClient.setQueryData(strategiesKeys.list('all'), ctx.previousAll);
      }
      if (ctx.previousDetail !== undefined) {
        queryClient.setQueryData(strategiesKeys.detail(id), ctx.previousDetail);
      }
    },

    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: strategiesKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: strategiesKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// Archive mutation
// ---------------------------------------------------------------------------

export function useArchiveStrategyMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: archiveStrategy,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: strategiesKeys.lists() });

      const previousActive = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('active'),
      );
      const previousAll = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('all'),
      );

      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('active'),
        (prev = []) => prev.filter((s) => s.id !== id),
      );
      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('all'),
        (prev = []) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'archived' as const } : s,
          ),
      );

      return { previousActive, previousAll };
    },

    onError: (_err, _id, context) => {
      const ctx = context as
        | { previousActive?: Strategy[]; previousAll?: Strategy[] }
        | undefined;
      if (!ctx) return;
      if (ctx.previousActive !== undefined) {
        queryClient.setQueryData(
          strategiesKeys.list('active'),
          ctx.previousActive,
        );
      }
      if (ctx.previousAll !== undefined) {
        queryClient.setQueryData(strategiesKeys.list('all'), ctx.previousAll);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: strategiesKeys.lists() });
    },
  });
}

// ---------------------------------------------------------------------------
// Restore mutation
// ---------------------------------------------------------------------------

export function useRestoreStrategyMutation() {
  const queryClient = useQueryClient();

  return useMutation<Strategy, ApiClientError, string>({
    mutationFn: restoreStrategy,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: strategiesKeys.lists() });

      const previousArchived = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('archived'),
      );
      const previousAll = queryClient.getQueryData<Strategy[]>(
        strategiesKeys.list('all'),
      );

      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('archived'),
        (prev = []) => prev.filter((s) => s.id !== id),
      );
      queryClient.setQueryData<Strategy[]>(
        strategiesKeys.list('all'),
        (prev = []) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'active' as const } : s,
          ),
      );

      return { previousArchived, previousAll };
    },

    onError: (_err, _id, context) => {
      const ctx = context as
        | { previousArchived?: Strategy[]; previousAll?: Strategy[] }
        | undefined;
      if (!ctx) return;
      if (ctx.previousArchived !== undefined) {
        queryClient.setQueryData(
          strategiesKeys.list('archived'),
          ctx.previousArchived,
        );
      }
      if (ctx.previousAll !== undefined) {
        queryClient.setQueryData(strategiesKeys.list('all'), ctx.previousAll);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: strategiesKeys.lists() });
    },
  });
}
