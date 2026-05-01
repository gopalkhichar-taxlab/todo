'use client';

/**
 * StrategyCard
 *
 * Displays a single strategy in a card format with:
 *  - Colored left border (strategy color)
 *  - Name, description (2-line clamp), active/completed task counts
 *  - Kebab menu: Edit, Archive (or Restore if archived)
 *  - Archive confirmation dialog
 */

import { useState, useRef, useEffect } from 'react';
import type { Strategy } from '@/lib/api/strategies';
import { useStrategyTaskCountsQuery } from '@/hooks/useStrategies';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyCardProps {
  strategy: Strategy;
  onEdit: (strategy: Strategy) => void;
  onArchive: (strategy: Strategy) => Promise<void>;
  onRestore: (strategy: Strategy) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Archive confirmation dialog
// ---------------------------------------------------------------------------

interface ArchiveConfirmDialogProps {
  strategyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  errorMessage?: string | null;
}

function ArchiveConfirmDialog({
  strategyName,
  onConfirm,
  onCancel,
  isPending,
  errorMessage,
}: ArchiveConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Shift focus to the Cancel button as soon as the dialog appears
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  // Allow Escape to dismiss the dialog (mirrors StrategyFormDialog behaviour)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isPending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
        aria-describedby="archive-dialog-desc"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-6 w-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4"
            />
          </svg>
        </div>

        <h3
          id="archive-dialog-title"
          className="mb-2 text-base font-semibold text-gray-900"
        >
          Archive &ldquo;{strategyName}&rdquo;?
        </h3>
        <p id="archive-dialog-desc" className="mb-6 text-sm text-gray-600">
          Tasks linked to this strategy will keep the link but won&apos;t
          appear under active strategies.
        </p>

        {errorMessage && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending && (
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            )}
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kebab menu
// ---------------------------------------------------------------------------

interface KebabMenuProps {
  isArchived: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

function KebabMenu({ isArchived, onEdit, onArchive, onRestore }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Strategy options"
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-10 min-w-[140px] rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {!isArchived && (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
          )}
          {!isArchived ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8"
                />
              </svg>
              Archive
            </button>
          ) : (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onRestore();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task count badge
// ---------------------------------------------------------------------------

function TaskCountBadge({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      aria-label={`${count} ${label} task${count !== 1 ? 's' : ''}`}
    >
      {count}
      <span className="sr-only">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// StrategyCard
// ---------------------------------------------------------------------------

export function StrategyCard({
  strategy,
  onEdit,
  onArchive,
  onRestore,
}: StrategyCardProps) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const isArchived = strategy.status === 'archived';
  const strategyColor = strategy.color ?? '#6b7280';

  // Task counts
  const {
    data: counts,
    isError: countsError,
    isLoading: countsLoading,
  } = useStrategyTaskCountsQuery(strategy.id);

  function handleArchiveClick() {
    setShowArchiveConfirm(true);
  }

  async function handleArchiveConfirm() {
    setIsArchiving(true);
    setArchiveError(null);
    try {
      await onArchive(strategy);
      setShowArchiveConfirm(false);
    } catch (err) {
      setArchiveError(
        err instanceof Error ? err.message : 'Failed to archive. Please try again.',
      );
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <>
      <article
        className={`group relative flex flex-col rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
          isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'
        }`}
        aria-label={`Strategy: ${strategy.name}${isArchived ? ' (archived)' : ''}`}
      >
        {/* Colored left accent border */}
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: strategyColor }}
          aria-hidden="true"
        />

        {/* Card content */}
        <div className="flex flex-1 flex-col gap-3 p-5 pl-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {/* Color swatch badge */}
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: strategyColor }}
                aria-hidden="true"
              />
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {strategy.name}
              </h3>
              {isArchived && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Archived
                </span>
              )}
            </div>

            <KebabMenu
              isArchived={isArchived}
              onEdit={() => onEdit(strategy)}
              onArchive={handleArchiveClick}
              onRestore={() => onRestore(strategy)}
            />
          </div>

          {/* Description */}
          {strategy.description ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
              {strategy.description}
            </p>
          ) : (
            <p className="text-xs italic text-gray-300">No description</p>
          )}

          {/* Task count row */}
          <div className="mt-auto flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-400">Tasks:</span>
            {countsError ? (
              <span className="text-xs text-gray-400" aria-label="Task count unavailable">
                —
              </span>
            ) : counts && !countsLoading ? (
              <>
                <TaskCountBadge
                  label="active"
                  count={counts.activeCount}
                  colorClass="bg-indigo-50 text-indigo-700"
                />
                <TaskCountBadge
                  label="completed"
                  count={counts.completedCount}
                  colorClass="bg-green-50 text-green-700"
                />
                {counts.totalCount > 0 && (
                  <span className="text-xs text-gray-400">
                    ({counts.totalCount} total)
                  </span>
                )}
              </>
            ) : (
              <span
                className="h-4 w-16 animate-pulse rounded bg-gray-100"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </article>

      {/* Archive confirmation dialog */}
      {showArchiveConfirm && (
        <ArchiveConfirmDialog
          strategyName={strategy.name}
          onConfirm={handleArchiveConfirm}
          onCancel={() => {
            setArchiveError(null);
            setShowArchiveConfirm(false);
          }}
          isPending={isArchiving}
          errorMessage={archiveError}
        />
      )}
    </>
  );
}
