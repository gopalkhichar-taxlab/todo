'use client';

/**
 * Minimal in-app toast notification system.
 *
 * Usage:
 *   const { toasts, showToast } = useToast();
 *   showToast({ message: 'Task created', type: 'success' });
 *
 *   // In JSX:
 *   <ToastContainer toasts={toasts} />
 */

import React, { useState, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let _toastId = 0;
function nextId() {
  return String(++_toastId);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info' }: { message: string; type?: ToastType }) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  return { toasts, showToast, dismiss };
}

// ---------------------------------------------------------------------------
// ToastItem
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ToastType, string> = {
  success:
    'bg-green-50 border-green-200 text-green-800',
  error:
    'bg-red-50 border-red-200 text-red-800',
  info:
    'bg-indigo-50 border-indigo-200 text-indigo-800',
};

const TYPE_ICON: Record<ToastType, React.ReactElement> = {
  success: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  info: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 flex-shrink-0 text-indigo-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
      />
    </svg>
  ),
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${
        TYPE_STYLES[toast.type]
      } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      {TYPE_ICON[toast.type]}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-2 flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
        aria-label="Dismiss notification"
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
  );
}

// ---------------------------------------------------------------------------
// ToastContainer — rendered at the bottom-right of the viewport
// ---------------------------------------------------------------------------

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-3"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-80 max-w-[90vw]">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
