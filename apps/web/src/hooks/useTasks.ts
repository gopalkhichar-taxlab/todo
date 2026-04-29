import { useQuery } from '@tanstack/react-query';
import { listTasks, type ListTasksParams, type TasksPage } from '@/lib/api/tasks';
import { ApiClientError } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Query key factory — keeps cache keys co-located with the hook
// ---------------------------------------------------------------------------

export const tasksKeys = {
  all: ['tasks'] as const,
  list: (params: ListTasksParams) => ['tasks', 'list', params] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTasksQueryResult {
  data: TasksPage | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches a paginated list of tasks, honouring all filter params.
 * Redirects to /login on a 401 response (auth guard).
 */
export function useTasksQuery(params: ListTasksParams = {}): UseTasksQueryResult {
  const router = useRouter();

  const query = useQuery<TasksPage, Error>({
    queryKey: tasksKeys.list(params),
    queryFn: () => listTasks(params),
  });

  // Auth guard: redirect to login on unauthenticated response
  useEffect(() => {
    if (
      query.error instanceof ApiClientError &&
      query.error.status === 401
    ) {
      router.replace('/login');
    }
  }, [query.error, router]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
