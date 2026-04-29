'use client';

import { useCallback, useRef, useState } from 'react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { Task, Strategy } from '@kudo/schemas';
import { PriorityPopover, type Priority } from './PriorityPopover';

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
// TaskRow props
// ---------------------------------------------------------------------------

export interface TaskRowProps {
  task: Task;
  strategy?: Strategy;
  /** From dnd-kit useSortable — undefined when DnD is not active */
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  /** When true, renders the row with dragging visual feedback */
  isDragging?: boolean;
  /** Called when user clicks Delete in the kebab menu */
  onDelete?: (task: Task) => void;
  /** Called when user clicks Edit in the kebab menu */
  onEdit?: (task: Task) => void;
  /** Called when user selects a new priority */
  onPriorityChange?: (task: Task, priority: Priority) => void;
}

// ---------------------------------------------------------------------------
// DragHandle
// ---------------------------------------------------------------------------

interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

function DragHandle({ attributes, listeners }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="flex-shrink-0 cursor-grab touch-none rounded p-1 text-gray-300 transition-colors hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Braille pattern dots (grip icon) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="9" cy="5" r="1.5" />
        <circle cx="15" cy="5" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="15" cy="19" r="1.5" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// KebabMenu
// ---------------------------------------------------------------------------

interface KebabMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function KebabMenu({ onEdit, onDelete }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  const handleButtonKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close],
  );

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={handleButtonKeyDown}
        aria-label="Task actions"
        aria-haspopup="true"
        aria-expanded={open}
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Task actions menu"
          className="absolute right-0 top-full z-40 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

export function TaskRow({
  task,
  strategy,
  dragHandleProps,
  isDragging = false,
  onDelete,
  onEdit,
  onPriorityChange,
}: TaskRowProps) {
  const priority = PRIORITY_BADGE[task.priority]!;
  const status = STATUS_BADGE[task.status]!;
  const isDone = task.status === 'done';

  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const priorityBadgeRef = useRef<HTMLDivElement>(null);

  const openPriorityPopover = useCallback(() => setPriorityPopoverOpen(true), []);
  const closePriorityPopover = useCallback(() => {
    setPriorityPopoverOpen(false);
    // Return focus to the priority badge trigger
    priorityBadgeRef.current?.focus();
  }, []);

  const handlePrioritySelect = useCallback(
    (newPriority: Priority) => {
      onPriorityChange?.(task, newPriority);
    },
    [task, onPriorityChange],
  );

  return (
    <li
      className={`group flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all duration-150 hover:shadow-md ${
        isDragging ? 'opacity-50 ring-2 ring-indigo-400 shadow-lg' : ''
      }`}
      role="listitem"
    >
      {/* Drag handle */}
      {dragHandleProps ? (
        <div className="flex-shrink-0 self-center">
          <DragHandle
            attributes={dragHandleProps.attributes}
            listeners={dragHandleProps.listeners}
          />
        </div>
      ) : (
        /* Placeholder when DnD not active — keeps layout stable */
        <div className="w-6 flex-shrink-0" aria-hidden="true" />
      )}

      {/* Strategy color chip */}
      <div
        className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full"
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

      {/* Badges + actions */}
      <div
        className="flex flex-shrink-0 flex-wrap items-center gap-2"
        aria-label="Task metadata"
      >
        {/* Priority badge — clickable to open popover */}
        <div className="relative" ref={priorityBadgeRef}>
          <button
            type="button"
            onClick={openPriorityPopover}
            aria-label={`Priority: ${priority.label}. Click to change`}
            aria-haspopup="listbox"
            aria-expanded={priorityPopoverOpen}
            className={`inline-flex cursor-pointer items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${priority.className}`}
          >
            {priority.label}
          </button>

          {priorityPopoverOpen && (
            <PriorityPopover
              taskId={task.id}
              currentPriority={task.priority}
              onSelect={handlePrioritySelect}
              onClose={closePriorityPopover}
            />
          )}
        </div>

        {/* Status badge */}
        <Badge label={status.label} className={status.className} />

        {/* Kebab menu */}
        {(onEdit || onDelete) && (
          <KebabMenu
            onEdit={() => onEdit?.(task)}
            onDelete={() => onDelete?.(task)}
          />
        )}
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
