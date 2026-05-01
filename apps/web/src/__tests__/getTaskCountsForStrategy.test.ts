/**
 * Unit tests for getTaskCountsForStrategy
 * Mocks apiRequest to verify: correct URL, pagination, count derivation, error propagation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the api-client module before importing the function under test
vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
}));

import { apiRequest } from '@/lib/api-client';
import { getTaskCountsForStrategy } from '@/lib/api/strategies';

const mockApiRequest = apiRequest as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockApiRequest.mockReset();
});

describe('getTaskCountsForStrategy', () => {
  it('calls /v1/tasks with strategy_id and limit=100 (not limit=0)', async () => {
    mockApiRequest.mockResolvedValueOnce({ items: [], nextCursor: null });

    await getTaskCountsForStrategy('strategy-123');

    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/v1/tasks?strategy_id=strategy-123&limit=100'),
    );
    // Regression: must NOT call with limit=0
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      expect.stringContaining('limit=0'),
    );
  });

  it('returns parsed { items, nextCursor } and derives counts from status', async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [
        { status: 'todo' },
        { status: 'in_progress' },
        { status: 'done' },
        { status: 'cancelled' }, // excluded from total
      ],
      nextCursor: null,
    });

    const counts = await getTaskCountsForStrategy('strategy-abc');

    expect(counts.activeCount).toBe(2);
    expect(counts.completedCount).toBe(1);
    expect(counts.totalCount).toBe(3); // cancelled excluded
  });

  it('paginates through nextCursor until null', async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        items: [{ status: 'todo' }, { status: 'done' }],
        nextCursor: 'cursor-page-2',
      })
      .mockResolvedValueOnce({
        items: [{ status: 'in_progress' }, { status: 'done' }],
        nextCursor: null,
      });

    const counts = await getTaskCountsForStrategy('strat-x');

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('cursor=cursor-page-2'),
    );
    expect(counts.activeCount).toBe(2); // todo + in_progress
    expect(counts.completedCount).toBe(2); // done x2
    expect(counts.totalCount).toBe(4);
  });

  it('propagates errors from apiRequest', async () => {
    const apiError = new Error('Network error');
    mockApiRequest.mockRejectedValueOnce(apiError);

    await expect(getTaskCountsForStrategy('strat-fail')).rejects.toThrow(
      'Network error',
    );
  });
});
