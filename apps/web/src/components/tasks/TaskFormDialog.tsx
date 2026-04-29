'use client';

/**
 * TaskFormDialog — modal dialog for creating and editing tasks.
 *
 * Props:
 *   open     — controls visibility
 *   onClose  — called when the dialog should close (success or cancel)
 *   taskId   — if provided, fetches the task and opens in edit mode
 *
 * Features:
 *   - Create mode: blank form with defaults (priority=medium, status=todo)
 *   - Edit mode: prefilled from fetched task data
 *   - Inline end_date < start_date validation
 *   - 412 stale banner with "Reload" button
 *   - Optimistic update on edit, pessimistic on create
 *   - Strategy searchable combobox with "None" option
 *   - Accessible: labels, aria-describedby, focus trap
 */

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type KeyboardEvent,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { Strategy } from '@kudo/schemas';
import { useStrategiesQuery } from '@/hooks/useStrategies';
import { useTaskQuery, useCreateTask, useUpdateTask } from '@/hooks/useTaskMutations';
import {
  taskFormSchema,
  type TaskFormValues,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  isoToDateInput,
} from '@/lib/forms/taskSchema';
import { ApiClientError } from '@/lib/api-client';
import { useToast, ToastContainer } from '@/components/ui/Toast';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  taskId?: string;
}

// ---------------------------------------------------------------------------
// Priority segmented control options
// ---------------------------------------------------------------------------

type PriorityOption = {
  value: TaskFormValues['priority'];
  label: string;
  activeClass: string;
};

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 'low',
    label: 'Low',
    activeClass: 'bg-gray-700 text-white shadow',
  },
  {
    value: 'medium',
    label: 'Med',
    activeClass: 'bg-blue-600 text-white shadow',
  },
  {
    value: 'high',
    label: 'High',
    activeClass: 'bg-orange-500 text-white shadow',
  },
  {
    value: 'critical',
    label: 'Critical',
    activeClass: 'bg-red-600 text-white shadow',
  },
];

// ---------------------------------------------------------------------------
// Status select options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: TaskFormValues['status']; label: string }> = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ---------------------------------------------------------------------------
// StrategyCombobox — searchable dropdown
// ---------------------------------------------------------------------------

interface StrategyComboboxProps {
  strategies: Strategy[];
  value: string; // '' = None
  onChange: (value: string) => void;
  isLoading: boolean;
  id: string;
  describedBy?: string;
}

function StrategyCombobox({
  strategies,
  value,
  onChange,
  isLoading,
  id,
  describedBy,
}: StrategyComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive display label from selected value
  const selectedStrategy = strategies.find((s) => s.id === value);
  const displayValue = value === '' ? '' : (selectedStrategy?.name ?? '');

  // When dropdown opens, show the current selection text in the input
  const handleFocus = useCallback(() => {
    setInputValue('');
    setOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click on option to fire first
    setTimeout(() => {
      setOpen(false);
      setInputValue('');
    }, 150);
  }, []);

  const handleSelect = useCallback(
    (strategyId: string) => {
      onChange(strategyId);
      setOpen(false);
      setInputValue('');
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    [],
  );

  // Filter strategies by search input
  const filteredStrategies = inputValue
    ? strategies.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase()),
      )
    : strategies;

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputValue('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger input */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-describedby={describedBy}
          autoComplete="off"
          placeholder={isLoading ? 'Loading strategies…' : 'Search or select strategy'}
          value={open ? inputValue : displayValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
        />
        {/* Chevron */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ maxHeight: '200px' }}
          aria-label="Strategies"
        >
          {/* None option */}
          <li
            role="option"
            aria-selected={value === ''}
            onMouseDown={() => handleSelect('')}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
              value === '' ? 'font-semibold text-indigo-600' : 'text-gray-700'
            }`}
          >
            <span className="h-3 w-3 rounded-full border border-dashed border-gray-400" />
            None
          </li>

          {/* Strategy options */}
          {filteredStrategies.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500 italic">No strategies found</li>
          )}
          {filteredStrategies.map((strategy) => (
            <li
              key={strategy.id}
              role="option"
              aria-selected={value === strategy.id}
              onMouseDown={() => handleSelect(strategy.id)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                value === strategy.id ? 'font-semibold text-indigo-600' : 'text-gray-700'
              }`}
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: strategy.color }}
                aria-hidden="true"
              />
              {strategy.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StaleBanner — 412 conflict notification
// ---------------------------------------------------------------------------

interface StaleBannerProps {
  onReload: () => void;
}

function StaleBanner({ onReload }: StaleBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
    >
      <span>Task was updated elsewhere — click reload to get latest changes.</span>
      <button
        type="button"
        onClick={onReload}
        className="flex-shrink-0 rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
      >
        Reload
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskFormDialog
// ---------------------------------------------------------------------------

export function TaskFormDialog({ open, onClose, taskId }: TaskFormDialogProps) {
  const isEditMode = Boolean(taskId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  const { toasts, showToast, dismiss } = useToast();
  const [showStaleBanner, setShowStaleBanner] = useState(false);

  // Strategies
  const { data: strategies = [], isLoading: strategiesLoading } = useStrategiesQuery({
    status: 'active',
    enabled: open,
  });

  // Task query (edit mode only)
  const {
    data: existingTask,
    isLoading: taskLoading,
    refetch: refetchTask,
  } = useTaskQuery(isEditMode ? taskId : undefined);

  // Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      start_date: '',
      end_date: '',
      strategy_id: '',
    },
  });

  // Prefill form when existing task loads in edit mode
  useEffect(() => {
    if (isEditMode && existingTask) {
      reset({
        title: existingTask.title,
        description: existingTask.description ?? '',
        priority: existingTask.priority,
        status: existingTask.status,
        start_date: isoToDateInput(existingTask.start_date),
        end_date: isoToDateInput(existingTask.end_date),
        strategy_id: existingTask.strategy_id ?? '',
      });
      setShowStaleBanner(false);
    }
  }, [existingTask, isEditMode, reset]);

  // Reset form on open (create mode)
  useEffect(() => {
    if (open && !isEditMode) {
      reset({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        start_date: '',
        end_date: '',
        strategy_id: '',
      });
      setShowStaleBanner(false);
    }
  }, [open, isEditMode, reset]);

  // Focus first input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
  }, [open]);

  // Trap focus within dialog
  const handleDialogKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  // Mutations
  const createMutation = useCreateTask({
    onSuccess: () => {
      showToast({ message: 'Task created', type: 'success' });
      setTimeout(onClose, 400);
    },
    onError: (error) => {
      showToast({
        message: `Failed to save task: ${error.message}`,
        type: 'error',
      });
    },
  });

  const updateMutation = useUpdateTask({
    onSuccess: () => {
      showToast({ message: 'Task updated', type: 'success' });
      setTimeout(onClose, 400);
    },
    onError: (error) => {
      if (error.status === 412) {
        setShowStaleBanner(true);
      } else {
        showToast({
          message: `Failed to save task: ${error.message}`,
          type: 'error',
        });
      }
    },
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit(async (values) => {
    if (isEditMode && taskId && existingTask) {
      const payload = formValuesToUpdatePayload(values);
      updateMutation.mutate({
        id: taskId,
        data: payload,
        updatedAt: existingTask.updated_at,
      });
    } else {
      const payload = formValuesToCreatePayload(values);
      createMutation.mutate(payload);
    }
  });

  const handleReload = useCallback(() => {
    setShowStaleBanner(false);
    refetchTask();
  }, [refetchTask]);

  const watchedPriority = watch('priority');
  const watchedStrategyId = watch('strategy_id') ?? '';
  const watchedStartDate = watch('start_date');

  if (!open) return null;

  const isLoadingData = isEditMode && taskLoading;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2
              id="task-dialog-title"
              className="text-lg font-bold tracking-tight text-gray-900"
            >
              {isEditMode ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close dialog"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Loading skeleton for edit mode */}
            {isLoadingData ? (
              <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading task data">
                <div className="h-9 w-full rounded-lg bg-gray-200" />
                <div className="h-20 w-full rounded-lg bg-gray-200" />
                <div className="h-9 w-full rounded-lg bg-gray-200" />
                <div className="h-9 w-full rounded-lg bg-gray-200" />
              </div>
            ) : (
              <form id="task-form" onSubmit={onSubmit} noValidate className="space-y-5">
                {/* Stale banner */}
                {showStaleBanner && <StaleBanner onReload={handleReload} />}

                {/* Title */}
                <div>
                  <label
                    htmlFor="task-title"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Title <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={firstFocusRef}
                    id="task-title"
                    type="text"
                    {...register('title')}
                    placeholder="What needs to be done?"
                    aria-required="true"
                    aria-describedby={errors.title ? 'task-title-error' : undefined}
                    aria-invalid={Boolean(errors.title)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.title
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-300 focus:border-indigo-500'
                    }`}
                  />
                  {errors.title && (
                    <p
                      id="task-title-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="task-description"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Description{' '}
                    <span className="font-normal text-gray-500">(supports Markdown)</span>
                  </label>
                  <textarea
                    id="task-description"
                    {...register('description')}
                    rows={4}
                    placeholder="Add more detail…"
                    aria-describedby={errors.description ? 'task-desc-error' : undefined}
                    aria-invalid={Boolean(errors.description)}
                    className={`w-full resize-y rounded-lg border px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.description
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-300 focus:border-indigo-500'
                    }`}
                  />
                  {errors.description && (
                    <p
                      id="task-desc-error"
                      role="alert"
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Priority — segmented control */}
                <div>
                  <fieldset>
                    <legend className="mb-1.5 block text-sm font-medium text-gray-700">
                      Priority
                    </legend>
                    <div
                      role="group"
                      className="inline-flex w-full rounded-lg border border-gray-300 bg-gray-100 p-1 shadow-sm"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={watchedPriority === opt.value}
                          onClick={() => setValue('priority', opt.value, { shouldValidate: true })}
                          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                            watchedPriority === opt.value
                              ? opt.activeClass
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Strategy */}
                <div>
                  <label
                    htmlFor="task-strategy"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Strategy
                  </label>
                  <StrategyCombobox
                    id="task-strategy"
                    strategies={strategies as Strategy[]}
                    value={watchedStrategyId}
                    onChange={(val) =>
                      setValue('strategy_id', val, { shouldValidate: true })
                    }
                    isLoading={strategiesLoading}
                  />
                </div>

                {/* Dates — start + end */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="task-start-date"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Start Date
                    </label>
                    <input
                      id="task-start-date"
                      type="date"
                      {...register('start_date')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="task-end-date"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      End Date
                    </label>
                    <input
                      id="task-end-date"
                      type="date"
                      {...register('end_date')}
                      min={watchedStartDate || undefined}
                      aria-describedby={errors.end_date ? 'task-end-date-error' : undefined}
                      aria-invalid={Boolean(errors.end_date)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                        errors.end_date
                          ? 'border-red-400 focus:border-red-400'
                          : 'border-gray-300 focus:border-indigo-500'
                      }`}
                    />
                    {errors.end_date && (
                      <p
                        id="task-end-date-error"
                        role="alert"
                        className="mt-1.5 text-xs text-red-600"
                      >
                        {errors.end_date.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="task-status"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="task-status"
                    {...register('status')}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isMutating}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              disabled={isMutating || isLoadingData || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMutating ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
