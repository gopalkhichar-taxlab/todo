'use client';

/**
 * UndoToast — fixed bottom-right toast with a countdown timer and Undo action.
 *
 * - Shows a message + progress bar that depletes over `duration` ms (default 5s)
 * - Clicking "Undo" calls `onUndo` and dismisses immediately
 * - Auto-dismisses after `duration` ms
 * - Accessible: role="status", aria-live="polite", countdown announced
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UndoToastProps {
  message: string;
  /** Duration in milliseconds before auto-dismiss. Default: 5000 */
  duration?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// UndoToast
// ---------------------------------------------------------------------------

export function UndoToast({
  message,
  duration = 5000,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(duration / 1000));
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Countdown via requestAnimationFrame for smooth progress bar
  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;

      setProgress(pct);
      setSecondsLeft(Math.ceil(remaining / 1000));

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (!dismissedRef.current) {
          dismissedRef.current = true;
          onDismiss();
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, onDismiss]);

  const handleUndo = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    onUndo();
    onDismiss();
  }, [onUndo, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-auto w-80 max-w-[90vw] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className="h-full bg-indigo-500 transition-none"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Trash icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0 text-gray-400"
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

        {/* Message */}
        <p className="flex-1 text-sm font-medium text-gray-800">
          {message}
        </p>

        {/* Countdown (screen-reader friendly) */}
        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {secondsLeft > 0 ? `${secondsLeft} seconds to undo` : 'Action completed'}
        </span>

        {/* Visible countdown */}
        <span
          className="flex-shrink-0 text-xs font-mono text-gray-400"
          aria-hidden="true"
        >
          {secondsLeft}s
        </span>

        {/* Undo button */}
        <button
          type="button"
          onClick={handleUndo}
          aria-label="Undo delete"
          className="flex-shrink-0 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          Undo
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UndoToastContainer — portal anchor at bottom-right
// ---------------------------------------------------------------------------

export interface UndoToastEntry {
  id: string;
  message: string;
  onUndo: () => void;
}

interface UndoToastContainerProps {
  toasts: UndoToastEntry[];
  onDismiss: (id: string) => void;
  duration?: number;
}

export function UndoToastContainer({
  toasts,
  onDismiss,
  duration,
}: UndoToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3"
      aria-label="Undo notifications"
    >
      {toasts.map((toast) => (
        <UndoToast
          key={toast.id}
          message={toast.message}
          duration={duration}
          onUndo={toast.onUndo}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useUndoToast hook
// ---------------------------------------------------------------------------

let _undoToastId = 0;
function nextUndoId() {
  return String(++_undoToastId);
}

export function useUndoToast() {
  const [toasts, setToasts] = useState<UndoToastEntry[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showUndoToast = useCallback(
    ({ message, onUndo }: { message: string; onUndo: () => void }) => {
      const id = nextUndoId();
      setToasts((prev) => [...prev, { id, message, onUndo }]);
      return id;
    },
    [],
  );

  return { toasts, showUndoToast, dismiss };
}
