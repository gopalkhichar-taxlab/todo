'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Strategy } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveFilters {
  strategy_id: string;
  status: string[]; // values of TaskStatus
  priority: string[]; // values of TaskPriority
  from: string;
  to: string;
}

interface FilterSidebarProps {
  strategies: Strategy[];
  filters: ActiveFilters;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CheckboxGroupProps {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  colorDot?: (value: string) => string | undefined;
}

function CheckboxGroup({ legend, options, selected, onChange, colorDot }: CheckboxGroupProps) {
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {legend}
      </legend>
      <ul className="space-y-1" role="group" aria-label={legend}>
        {options.map((opt) => {
          const id = `filter-${legend.toLowerCase().replace(/\s+/g, '-')}-${opt.value}`;
          const checked = selected.includes(opt.value);
          const dotColor = colorDot?.(opt.value);
          return (
            <li key={opt.value}>
              <label
                htmlFor={id}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  checked
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-checked={checked}
                />
                {dotColor && (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                )}
                <span>{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// FilterSidebar
// ---------------------------------------------------------------------------

export function FilterSidebar({ strategies, filters, className = '' }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Push a new set of params to the URL, preserving unrelated params. */
  const updateParams = useCallback(
    (updates: Partial<Record<string, string | string[] | undefined>>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, value);
        }
      }

      // Reset cursor on filter change
      params.delete('cursor');

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasActiveFilters =
    filters.strategy_id ||
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.from ||
    filters.to;

  const clearAll = () => {
    router.push(pathname);
  };

  // Strategy options for the checkbox group
  const strategyOptions = strategies.map((s) => ({ value: s.id, label: s.name }));
  const strategyColorMap = Object.fromEntries(strategies.map((s) => [s.id, s.color]));

  return (
    <aside
      className={`flex w-64 flex-shrink-0 flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
      aria-label="Task filters"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Strategy filter */}
      {strategyOptions.length > 0 && (
        <CheckboxGroup
          legend="Strategy"
          options={strategyOptions}
          selected={filters.strategy_id ? [filters.strategy_id] : []}
          onChange={(vals) =>
            updateParams({ strategy_id: vals[vals.length - 1] ?? undefined })
          }
          colorDot={(value) => strategyColorMap[value]}
        />
      )}

      {/* Priority filter */}
      <CheckboxGroup
        legend="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onChange={(vals) => updateParams({ priority: vals })}
      />

      {/* Status filter */}
      <CheckboxGroup
        legend="Status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onChange={(vals) => updateParams({ status: vals })}
      />

      {/* Date range filter */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Date Range
        </legend>
        <div className="space-y-2">
          <div>
            <label
              htmlFor="filter-from"
              className="mb-1 block text-xs text-gray-600"
            >
              From
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={(e) =>
                updateParams({ from: e.target.value ? e.target.value + 'T00:00:00.000Z' : undefined })
              }
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Filter from date"
            />
          </div>
          <div>
            <label
              htmlFor="filter-to"
              className="mb-1 block text-xs text-gray-600"
            >
              To
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to ? filters.to.split('T')[0] : ''}
              onChange={(e) =>
                updateParams({ to: e.target.value ? e.target.value + 'T23:59:59.999Z' : undefined })
              }
              min={filters.from ? filters.from.split('T')[0] : undefined}
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Filter to date"
            />
          </div>
        </div>
      </fieldset>
    </aside>
  );
}
