import { TaskRowSkeleton } from '@/components/tasks/TaskRow';

/**
 * Next.js route-level loading UI.
 * Shown by the App Router during the initial Suspense boundary before
 * the page component resolves. Also exported as TasksPageSkeleton so the
 * Suspense fallback in page.tsx can reuse the same markup.
 */
export function TasksPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header skeleton */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl animate-pulse items-center gap-4">
          {/* Title */}
          <div className="mr-auto h-6 w-20 rounded bg-gray-200" />
          {/* Search */}
          <div className="h-9 w-64 rounded-lg bg-gray-200" />
          {/* Sort */}
          <div className="h-9 w-36 rounded-lg bg-gray-200" />
          {/* CTA */}
          <div className="h-9 w-24 rounded-lg bg-gray-200" />
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-6">
        {/* Sidebar skeleton */}
        <aside className="w-64 flex-shrink-0 animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-4 w-16 rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-full rounded bg-gray-100" />
            ))}
          </div>
          <div className="mt-6 mb-2 h-3 w-20 rounded bg-gray-200" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-full rounded bg-gray-100" />
            ))}
          </div>
        </aside>

        {/* Task list skeleton */}
        <main className="flex-1 min-w-0">
          <ul className="space-y-3" aria-label="Loading tasks" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskRowSkeleton key={i} />
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}

export default TasksPageSkeleton;
