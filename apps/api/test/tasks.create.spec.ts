import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma before importing service
// ---------------------------------------------------------------------------

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { tasksService } from '../src/tasks/tasks.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPrisma = prisma as {
  task: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = 'aabbccdd-0000-0000-0000-000000000001';
const TASK_ID = 'aabbccdd-0000-0000-0000-000000000003';

function makeDbTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TASK_ID,
    userId: USER_ID,
    strategyId: null,
    title: 'Test Task',
    description: null,
    priority: 'medium' as const,
    status: 'todo' as const,
    startDate: null,
    endDate: null,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: tasksService.create
// ---------------------------------------------------------------------------

describe('tasksService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a task and returns the DTO', async () => {
    // nextSortOrder query returns null (no existing tasks)
    mockPrisma.task.findFirst.mockResolvedValue(null);
    mockPrisma.task.create.mockResolvedValue(makeDbTask());

    const result = await tasksService.create(USER_ID, {
      title: 'Test Task',
      priority: 'medium',
      status: 'todo',
    });

    expect(result).toMatchObject({
      id: TASK_ID,
      user_id: USER_ID,
      title: 'Test Task',
      priority: 'medium',
      status: 'todo',
      sort_order: 0,
      strategy_id: null,
      deleted_at: null,
    });

    expect(mockPrisma.task.create).toHaveBeenCalledOnce();
  });

  it('auto-increments sort_order based on existing tasks', async () => {
    // nextSortOrder query returns existing task with sortOrder=4
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask({ sortOrder: 4 }));
    mockPrisma.task.create.mockResolvedValue(makeDbTask({ sortOrder: 5 }));

    const result = await tasksService.create(USER_ID, {
      title: 'Another Task',
      priority: 'high',
      status: 'todo',
    });

    expect(result.sort_order).toBe(5);
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 5 }),
      }),
    );
  });

  it('respects explicit sort_order when provided', async () => {
    mockPrisma.task.create.mockResolvedValue(makeDbTask({ sortOrder: 10 }));

    const result = await tasksService.create(USER_ID, {
      title: 'Pinned Task',
      priority: 'low',
      status: 'todo',
      sort_order: 10,
    });

    expect(result.sort_order).toBe(10);
    // findFirst for nextSortOrder should NOT have been called
    expect(mockPrisma.task.findFirst).not.toHaveBeenCalled();
  });

  it('maps start_date and end_date to ISO strings', async () => {
    const startDate = new Date('2024-06-01T00:00:00.000Z');
    const endDate = new Date('2024-06-30T00:00:00.000Z');
    mockPrisma.task.findFirst.mockResolvedValue(null);
    mockPrisma.task.create.mockResolvedValue(
      makeDbTask({ startDate, endDate }),
    );

    const result = await tasksService.create(USER_ID, {
      title: 'Dated Task',
      start_date: '2024-06-01T00:00:00.000Z',
      end_date: '2024-06-30T00:00:00.000Z',
    });

    expect(result.start_date).toBe('2024-06-01T00:00:00.000Z');
    expect(result.end_date).toBe('2024-06-30T00:00:00.000Z');
  });

  it('sets strategyId from strategy_id field', async () => {
    const strategyId = 'aabbccdd-0000-0000-0000-000000000002';
    mockPrisma.task.findFirst.mockResolvedValue(null);
    mockPrisma.task.create.mockResolvedValue(
      makeDbTask({ strategyId }),
    );

    const result = await tasksService.create(USER_ID, {
      title: 'Strategy Task',
      strategy_id: strategyId,
    });

    expect(result.strategy_id).toBe(strategyId);
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ strategyId }),
      }),
    );
  });
});
