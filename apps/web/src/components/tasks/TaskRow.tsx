'use client';

import type { Task } from '@kudo/schemas';
import type { Strategy } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const PRIORITY_BADGE: Record<Task['priority'], { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 ring-red-600/20' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 ring-orange-600/20' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 ring-blue-600/20' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
};

const STATUS_BADGE: Record<Task['status'], { label: string; className: string }> = {
  todo: { label: 'To Do', className: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  in_progress: {
    label: 'In Progress',
    className: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  },
  done: { label: 'Done', className: 'bg-green-100 text-green-700 ring-green-600/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 ring-red-500/20' },
};

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

interface TaskRowProps {
  task: Task;
  strategy?: Strategy;
}

export function TaskRow({ task, strategy }: TaskRowProps) {
  const priority = PRIORITY_BADGE[task.priority];
  const status = STATUS_BADGE[task.status];
  const isDone = task.status === 'done';

  return (
    <li
      className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
      role="listitem"
    >
      {/* Strategy color chip */}
      <div
        className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
        style={{ backgroundColor: strategy?.color ?? '#9ca3af' }}
        aria-label={strategy ? `Strategy: ${strategy.name}` : 'No strategy'}
        title={strategy?.name ?? 'No strategy'}
      />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`truncate text-sm font-semibold ${
              isDone ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>

          {strategy && (
            <span className="truncate text-xs text-gray-500">
              {strategy.name}
            </span>
          )}
        </div>

        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {task.description}
          </p>
        )}

        {/* Date range */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {(task.start_date || task.end_date) && (
            <span aria-label="Date range">
              {formatDate(task.start_date)}
              {task.end_date && task.end_date !== task.start_date && (
                <> &rarr; {formatDate(task.end_date)}</>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div
        className="flex flex-shrink-0 flex-wrap items-center gap-2"
        aria-label="Task metadata"
      >
        <Badge label={priority.label} className={priority.className} />
        <Badge label={status.label} className={status.className} />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Skeleton row — shown while loading
// ---------------------------------------------------------------------------

export function TaskRowSkeleton() {
  return (
    <li
      className="flex animate-pulse items-start gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
      aria-hidden="true"
    >
      {/* Color chip */}
      <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-gray-200" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
        <div className="h-3 w-1/4 rounded bg-gray-100" />
      </div>

      {/* Badges */}
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        <div className="h-5 w-20 rounded-full bg-gray-200" />
      </div>
    </li>
  );
}
