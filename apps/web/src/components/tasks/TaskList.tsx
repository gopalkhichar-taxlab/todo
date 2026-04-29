'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { useTasksQuery } from '@/hooks/useTasks';
import { useStrategiesQuery } from '@/hooks/useStrategies';
import { FilterSidebar, type ActiveFilters } from './FilterSidebar';
import { TaskRow, TaskRowSkeleton } from './TaskRow';
import { TaskFormDialog } from './TaskFormDialog';
import type { Strategy } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Sort dropdown options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'due', label: 'Due Date' },
  { value: 'created_at', label: 'Recently Created' },
  { value: 'sort_order', label: 'Custom Order' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// ---------------------------------------------------------------------------
// Helper: read filters from URLSearchParams
// ---------------------------------------------------------------------------

function parseFilters(params: URLSearchParams): ActiveFilters {
  return {
    strategy_id: params.get('strategy_id') ?? '',
    status: params.get('status') ? params.get('status')!.split(',').filter(Boolean) : [],
    priority: params.get('priority') ? params.get('priority')!.split(',').filter(Boolean) : [],
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
}

function hasActiveFilters(filters: ActiveFilters): boolean {
  return !!(
    filters.strategy_id ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.from ||
    filters.to
  );
}

// ---------------------------------------------------------------------------
// TaskList
// ---------------------------------------------------------------------------

export function TaskList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- Task form dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | undefined>(undefined);

  const openCreateDialog = useCallback(() => {
    setEditTaskId(undefined);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditTaskId(undefined);
  }, []);

  // ---- Search state (locally debounced, URL is source of truth for re-fetch)
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search to URL
  const prevDebouncedRef = useRef(debouncedSearch);
  useEffect(() => {
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('q', debouncedSearch);
    } else {
      params.delete('q');
    }
    params.delete('cursor');
    router.push(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, router, searchParams]);

  // ---- Sort state
  const sortParam = (searchParams.get('sort') ?? 'priority') as SortValue;
  const orderParam = searchParams.get('order') ?? 'asc';

  const updateSort = useCallback(
    (sort: SortValue) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', sort);
      params.delete('cursor');
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // ---- Filters (read from URL)
  const filters = parseFilters(searchParams);
  const filtersActive = hasActiveFilters(filters) || !!debouncedSearch;

  // ---- Strategies
  const { data: strategies = [], isLoading: strategiesLoading } = useStrategiesQuery({
    status: 'all',
  });
  const strategyMap = Object.fromEntries(
    (strategies as Strategy[]).map((s) => [s.id, s]),
  );

  // ---- Tasks query params derived from URL
  const queryParams = {
    ...(filters.strategy_id ? { strategy_id: filters.strategy_id } : {}),
    ...(filters.status.length > 0 ? { status: filters.status.join(',') } : {}),
    ...(filters.priority.length > 0 ? { priority: filters.priority.join(',') } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    sort: sortParam,
    order: orderParam,
    ...(searchParams.get('cursor') ? { cursor: searchParams.get('cursor')! } : {}),
  };

  const { data, isLoading, isFetching, isError, error } = useTasksQuery(queryParams);

  const tasks = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const clearFilters = useCallback(() => {
    router.push(pathname);
    setSearchInput('');
  }, [pathname, router]);

  // ---- Render
  return (
    <div className="flex min-h-screen flex-col gap-0 bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {/* Page title */}
          <h1 className="mr-auto text-xl font-bold tracking-tight text-gray-900">
            Tasks
          </h1>

          {/* Search */}
          <div className="relative w-64">
            <label htmlFor="task-search" className="sr-only">
              Search tasks
            </label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
            </span>
            <input
              id="task-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tasks…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Search tasks"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm text-gray-600 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortParam}
              onChange={(e) => updateSort(e.target.value as SortValue)}
              className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Sort tasks by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Create task CTA */}
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Create a new task"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + New Task
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        {/* Sidebar */}
        <FilterSidebar
          strategies={strategies as Strategy[]}
          filters={filters}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0" aria-live="polite" aria-busy={isLoading || isFetching}>
          {/* Fetching indicator */}
          {isFetching && !isLoading && (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-700"
              role="status"
              aria-label="Refreshing task list"
            >
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Refreshing…
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
              role="alert"
            >
              <p className="font-semibold">Failed to load tasks</p>
              <p className="mt-1 text-red-600">{error?.message}</p>
            </div>
          )}

          {/* Skeleton rows */}
          {isLoading && !isError && (
            <ul className="space-y-3" aria-label="Loading tasks" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <TaskRowSkeleton key={i} />
              ))}
            </ul>
          )}

          {/* Task list */}
          {!isLoading && !isError && tasks.length > 0 && (
            <>
              <ul className="space-y-3" aria-label={`${tasks.length} tasks`}>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    strategy={task.strategy_id ? strategyMap[task.strategy_id] : undefined}
                  />
                ))}
              </ul>

              {/* Pagination */}
              {nextCursor && (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`${pathname}?${new URLSearchParams({
                      ...Object.fromEntries(searchParams.entries()),
                      cursor: nextCursor,
                    }).toString()}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label="Load next page of tasks"
                  >
                    Load more
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Empty state — no filters active */}
          {!isLoading && !isError && tasks.length === 0 && !filtersActive && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mb-4 h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h2 className="text-base font-semibold text-gray-800">
                Your task list is empty
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first task.
              </p>
              <button
                type="button"
                onClick={openCreateDialog}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Create your first task"
              >
                Create your first task
              </button>
            </div>
          )}

          {/* Empty state — filters active but no results */}
          {!isLoading && !isError && tasks.length === 0 && filtersActive && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mb-4 h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                />
              </svg>
              <h2 className="text-base font-semibold text-gray-800">
                No tasks match your filters
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or search term.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Clear all active filters"
              >
                Clear filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Task create/edit dialog */}
      <TaskFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        taskId={editTaskId}
      />
    </div>
  );
}
