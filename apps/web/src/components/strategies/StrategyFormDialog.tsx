'use client';

/**
 * StrategyFormDialog
 *
 * Modal dialog for creating and editing a Strategy.
 * Features:
 *  - Name (required), description (optional)
 *  - Color picker: 8 accessible preset swatches + custom hex input
 *  - Inline 409 duplicate-name error under the name field
 *  - Controlled open/close via props
 */

import { useState, useEffect, useRef } from 'react';
import { ApiClientError } from '@/lib/api-client';
import type { Strategy } from '@/lib/api/strategies';
import {
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
} from '@/hooks/useStrategies';

// ---------------------------------------------------------------------------
// Accessible preset colors (≥4.5:1 contrast against white)
// ---------------------------------------------------------------------------

export const PRESET_COLORS = [
  { hex: '#1D4ED8', label: 'Blue' },
  { hex: '#047857', label: 'Emerald' },
  { hex: '#B45309', label: 'Amber' },
  { hex: '#B91C1C', label: 'Red' },
  { hex: '#6D28D9', label: 'Violet' },
  { hex: '#BE185D', label: 'Pink' },
  { hex: '#0F766E', label: 'Teal' },
  { hex: '#C2410C', label: 'Orange' },
] as const;

const DEFAULT_COLOR = PRESET_COLORS[0].hex as string;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrategyFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the dialog is in edit mode. */
  strategy?: Strategy;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StrategyFormDialog({
  open,
  onClose,
  strategy,
}: StrategyFormDialogProps) {
  const isEditMode = Boolean(strategy);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COLOR);
  const [customHex, setCustomHex] = useState('');
  const [customHexError, setCustomHexError] = useState('');

  // Validation errors
  const [nameError, setNameError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateStrategyMutation();
  const updateMutation = useUpdateStrategyMutation();

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Seed form when dialog opens or strategy changes
  useEffect(() => {
    if (open) {
      setName(strategy?.name ?? '');
      setDescription(strategy?.description ?? '');
      setColor((strategy?.color as string) ?? DEFAULT_COLOR);
      setCustomHex('');
      setCustomHexError('');
      setNameError('');
      // Focus is handled via autoFocus on the name input; no setTimeout needed
    }
  }, [open, strategy]);

  function close() {
    if (isMutating) return;
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  // Hex validation
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;

  function handleCustomHexChange(value: string) {
    setCustomHex(value);
    if (value === '') {
      setCustomHexError('');
      return;
    }
    const normalized = value.startsWith('#') ? value : `#${value}`;
    if (HEX_RE.test(normalized)) {
      setColor(normalized);
      setCustomHexError('');
    } else {
      setCustomHexError('Enter a valid 6-digit hex color (e.g. #a1b2c3)');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError('');

    if (!name.trim()) {
      setNameError('Name is required');
      nameInputRef.current?.focus();
      return;
    }

    try {
      if (isEditMode && strategy) {
        await updateMutation.mutateAsync({
          id: strategy.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            color,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          status: 'active',
        });
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          setNameError(
            err.message ||
              'A strategy with this name already exists. Please choose a different name.',
          );
          nameInputRef.current?.focus();
          return;
        }
        setNameError(err.message || 'Something went wrong. Please try again.');
      }
    }
  }

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="strategy-dialog-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2
            id="strategy-dialog-title"
            className="text-lg font-semibold text-gray-900"
          >
            {isEditMode ? 'Edit Strategy' : 'New Strategy'}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={isMutating}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 py-5">
            {/* Name */}
            <div>
              <label
                htmlFor="strategy-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name{' '}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                ref={nameInputRef}
                id="strategy-name"
                type="text"
                // autoFocus handles initial focus when the dialog mounts;
                // nameInputRef is kept for programmatic focus on validation errors
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="e.g. Q3 Growth Initiative"
                maxLength={200}
                required
                aria-required="true"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'strategy-name-error' : undefined}
                className={`block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  nameError
                    ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400'
                    : 'border-gray-300 bg-white focus:border-indigo-400'
                }`}
              />
              {nameError && (
                <p
                  id="strategy-name-error"
                  role="alert"
                  className="mt-1.5 flex items-center gap-1 text-xs text-red-600"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {nameError}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="strategy-description"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Description{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="strategy-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe this strategy's objective…"
                rows={3}
                maxLength={5000}
                className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Color picker */}
            <div>
              <p className="mb-2 block text-sm font-medium text-gray-700">
                Color
              </p>

              {/* Preset swatches */}
              <div
                role="radiogroup"
                aria-label="Preset colors"
                className="flex flex-wrap gap-2"
              >
                {PRESET_COLORS.map((preset) => {
                  const isSelected = color === preset.hex;
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={preset.label}
                      title={preset.label}
                      onClick={() => {
                        setColor(preset.hex as string);
                        setCustomHex('');
                        setCustomHexError('');
                      }}
                      className={`relative h-8 w-8 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isSelected
                          ? 'scale-110 ring-2 ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && (
                        <svg
                          className="absolute inset-0 m-auto h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom hex input */}
              <div className="mt-3">
                <label
                  htmlFor="strategy-color-hex"
                  className="mb-1 block text-xs font-medium text-gray-500"
                >
                  Custom hex color
                </label>
                <div className="flex items-center gap-2">
                  {/* Preview swatch */}
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border border-gray-200"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <input
                    id="strategy-color-hex"
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    placeholder="#1D4ED8"
                    maxLength={7}
                    aria-invalid={Boolean(customHexError)}
                    aria-describedby={
                      customHexError ? 'hex-error' : undefined
                    }
                    className={`block w-36 rounded-lg border px-2.5 py-1.5 text-sm font-mono text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      customHexError
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  />
                </div>
                {customHexError && (
                  <p
                    id="hex-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {customHexError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={close}
              disabled={isMutating}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMutating || Boolean(customHexError)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {isMutating && (
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
              {isEditMode ? 'Save changes' : 'Create strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
