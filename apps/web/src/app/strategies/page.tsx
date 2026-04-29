/**
 * /strategies — Strategy Management Screen (TAL-90)
 *
 * Features:
 *  - Grid of active strategy cards (2 cols md, 3 cols lg)
 *  - "+ New Strategy" button opens StrategyFormDialog in create mode
 *  - "Show archived" toggle to include archived strategies
 *  - Kebab menu per card: Edit, Archive (with confirmation), Restore
 *  - Inline 409 error for duplicate name
 *  - Optimistic updates with rollback on error
 */

'use client';

import { useState } from 'react';
import { QueryProvider } from '@/providers/QueryProvider';
import { StrategyCard } from '@/components/strategies/StrategyCard';
import { StrategyFormDialog } from '@/components/strategies/StrategyFormDialog';
import {
  useStrategiesQuery,
  useArchiveStrategyMutation,
  useRestoreStrategyMutation,
} from '@/hooks/useStrategies';
import type { Strategy } from '@/lib/api/strategies';

// ---------------------------------------------------------------------------
// Strategies content — must be inside QueryProvider
// ---------------------------------------------------------------------------

function StrategiesContent() {
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | undefined>(
    undefined,
  );

  const status = showArchived ? 'all' : 'active';

  const { data: strategies, isLoading, isError, error } = useStrategiesQuery({
    status,
  });

  const archiveMutation = useArchiveStrategyMutation();
  const restoreMutation = useRestoreStrategyMutation();

  // Separate active vs archived for rendering
  const activeStrategies = strategies?.filter((s) => s.status === 'active') ?? [];
  const archivedStrategies =
    strategies?.filter((s) => s.status === 'archived') ?? [];

  function openCreateDialog() {
    setEditingStrategy(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(strategy: Strategy) {
    setEditingStrategy(strategy);
    setDialogOpen(true);
  }

  function handleArchive(strategy: Strategy) {
    archiveMutation.mutate(strategy.id);
  }

  function handleRestore(strategy: Strategy) {
    restoreMutation.mutate(strategy.id);
  }

  // -----------------------------------------------------------------------
  // Page header (always rendered)
  // -----------------------------------------------------------------------

  const pageHeader = (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Strategies
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Organize your tasks around high-level strategic objectives.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Show archived toggle */}
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
          <span>Show archived</span>
          <button
            type="button"
            role="switch"
            aria-checked={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              showArchived ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                showArchived ? 'translate-x-4' : 'translate-x-0'
              }`}
              aria-hidden="true"
            />
          </button>
        </label>

        {/* New Strategy button */}
        <button
          type="button"
          onClick={openCreateDialog}
          data-testid="new-strategy-btn"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New Strategy
        </button>
      </div>
    </header>
  );

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <>
        {pageHeader}
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Loading strategies"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-gray-100 bg-gray-50"
              aria-hidden="true"
            />
          ))}
        </div>
      </>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (isError) {
    return (
      <>
        {pageHeader}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-8 text-center"
        >
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">
            {error?.message ?? 'Failed to load strategies. Please refresh.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  const hasNoStrategies =
    activeStrategies.length === 0 &&
    (!showArchived || archivedStrategies.length === 0);

  if (hasNoStrategies) {
    return (
      <>
        {pageHeader}
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <svg
              className="h-8 w-8 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              No strategies yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first strategy to start organizing tasks around
              objectives.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateDialog}
            className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Strategy
          </button>
        </div>

        <StrategyFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          strategy={editingStrategy}
        />
      </>
    );
  }

  // -----------------------------------------------------------------------
  // Main content grid
  // -----------------------------------------------------------------------

  return (
    <>
      {pageHeader}

      <div className="space-y-8">
        {/* Active strategies section */}
        {activeStrategies.length > 0 && (
          <section aria-labelledby="active-heading">
            {showArchived && (
              <h2
                id="active-heading"
                className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500"
              >
                Active
              </h2>
            )}
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Active strategies"
            >
              {activeStrategies.map((s) => (
                <div key={s.id} role="listitem">
                  <StrategyCard
                    strategy={s}
                    onEdit={openEditDialog}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Archived strategies section */}
        {showArchived && archivedStrategies.length > 0 && (
          <section aria-labelledby="archived-heading">
            <h2
              id="archived-heading"
              className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400"
            >
              Archived
            </h2>
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
              aria-label="Archived strategies"
            >
              {archivedStrategies.map((s) => (
                <div key={s.id} role="listitem">
                  <StrategyCard
                    strategy={s}
                    onEdit={openEditDialog}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Form dialog */}
      <StrategyFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        strategy={editingStrategy}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps content in QueryProvider
// ---------------------------------------------------------------------------

export default function StrategiesPage() {
  return (
    <QueryProvider>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <StrategiesContent />
      </main>
    </QueryProvider>
  );
}
