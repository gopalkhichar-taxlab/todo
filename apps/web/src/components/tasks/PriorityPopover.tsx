'use client';

/**
 * PriorityPopover — floating listbox for changing task priority inline.
 *
 * - Triggered by clicking the priority badge in TaskRow
 * - Shows 4 options: Low / Medium / High / Critical
 * - Clicking an option fires PATCH /tasks/:id with the new priority
 * - Closes on outside click or Escape
 * - Shows a checkmark next to the current priority
 * - Accessible: role="listbox", options are role="option", aria-selected
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Task } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Priority = Task['priority'];

export interface PriorityPopoverProps {
  taskId: string;
  currentPriority: Priority;
  /** Called when the user selects a new priority. Parent handles the mutation. */
  onSelect: (priority: Priority) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Priority option config
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: Array<{
  value: Priority;
  label: string;
  dotClass: string;
  labelClass: string;
}> = [
  {
    value: 'low',
    label: 'Low',
    dotClass: 'bg-gray-400',
    labelClass: 'text-gray-700',
  },
  {
    value: 'medium',
    label: 'Medium',
    dotClass: 'bg-blue-500',
    labelClass: 'text-blue-700',
  },
  {
    value: 'high',
    label: 'High',
    dotClass: 'bg-orange-500',
    labelClass: 'text-orange-700',
  },
  {
    value: 'critical',
    label: 'Critical',
    dotClass: 'bg-red-600',
    labelClass: 'text-red-700',
  },
];

// ---------------------------------------------------------------------------
// PriorityPopover
// ---------------------------------------------------------------------------

export function PriorityPopover({
  currentPriority,
  onSelect,
  onClose,
}: PriorityPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(
    PRIORITY_OPTIONS.findIndex((o) => o.value === currentPriority),
  );

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  // Focus the listbox when it mounts
  useEffect(() => {
    popoverRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            Math.min(prev + 1, PRIORITY_OPTIONS.length - 1),
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < PRIORITY_OPTIONS.length) {
            onSelect(PRIORITY_OPTIONS[focusedIndex]!.value);
            onClose();
          }
          break;
        default:
          break;
      }
    },
    [focusedIndex, onSelect, onClose],
  );

  return (
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Select priority"
      aria-activedescendant={
        focusedIndex >= 0 && focusedIndex < PRIORITY_OPTIONS.length
          ? `priority-option-${PRIORITY_OPTIONS[focusedIndex]!.value}`
          : undefined
      }
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none"
    >
      {PRIORITY_OPTIONS.map((opt, idx) => {
        const isSelected = opt.value === currentPriority;
        const isFocused = idx === focusedIndex;

        return (
          <div
            key={opt.value}
            id={`priority-option-${opt.value}`}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            onMouseEnter={() => setFocusedIndex(idx)}
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${
              isFocused ? 'bg-gray-50' : ''
            }`}
          >
            {/* Colour dot */}
            <span
              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${opt.dotClass}`}
              aria-hidden="true"
            />

            {/* Label */}
            <span className={`flex-1 font-medium ${opt.labelClass}`}>
              {opt.label}
            </span>

            {/* Checkmark for current */}
            {isSelected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 flex-shrink-0 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
