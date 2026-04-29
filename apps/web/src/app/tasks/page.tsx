import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TaskList } from '@/components/tasks/TaskList';
import { TasksPageSkeleton } from './loading';

export const metadata: Metadata = {
  title: 'Tasks — KUDO',
  description: 'View and manage your strategic tasks.',
};

/**
 * Tasks list page — the primary work surface.
 *
 * URL query params are the single source of truth for filters, sort, search,
 * and pagination. Sharing the URL reproduces the same filtered view (AC #2, #5).
 *
 * The page is a Server Component so metadata is SSR-rendered; the TaskList
 * client component hydrates search-param state without a full page reload.
 *
 * Wrapped in <Suspense> so useSearchParams() works correctly in Next.js 15
 * App Router (required when using hooks that read dynamic params).
 */
export default function TasksPage() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TaskList />
    </Suspense>
  );
}
