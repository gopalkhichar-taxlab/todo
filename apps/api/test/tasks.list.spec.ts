import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma before importing service
// ---------------------------------------------------------------------------

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const TASK_1 = 'task0001-0000-0000-0000-000000000001';
const TASK_2 = 'task0002-0000-0000-0000-000000000002';
const STRATEGY_ID = 'strat001-0000-0000-0000-000000000001';

function makeDbTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TASK_1,
    userId: USER_A,
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

const defaultListQuery = {
  limit: 25,
  sort: 'sort_order' as const,
  order: 'asc' as const,
};

// ---------------------------------------------------------------------------
// Tests: tasksService.list
// ---------------------------------------------------------------------------

describe('tasksService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1 — returns only the caller\'s tasks (userId scoped)', async () => {
    const task = makeDbTask({ userId: USER_A });
    mockPrisma.task.findMany.mockResolvedValue([task]);

    const result = await tasksService.list(USER_A, defaultListQuery);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].user_id).toBe(USER_A);

    // Verify the Prisma call scoped to user
    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.userId).toBe(USER_A);
    expect(callArgs.where.deletedAt).toBeNull();
  });

  it('AC2a — strategy_id filter is applied when provided', async () => {
    mockPrisma.task.findMany.mockResolvedValue([makeDbTask({ strategyId: STRATEGY_ID })]);

    await tasksService.list(USER_A, { ...defaultListQuery, strategy_id: STRATEGY_ID });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.strategyId).toBe(STRATEGY_ID);
  });

  it('AC2b — status filter applied when provided', async () => {
    mockPrisma.task.findMany.mockResolvedValue([makeDbTask({ status: 'done' })]);

    await tasksService.list(USER_A, { ...defaultListQuery, status: ['done'] });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.status).toEqual({ in: ['done'] });
  });

  it('AC2c — priority filter applied when provided', async () => {
    mockPrisma.task.findMany.mockResolvedValue([makeDbTask({ priority: 'high' })]);

    await tasksService.list(USER_A, { ...defaultListQuery, priority: ['high', 'critical'] });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.priority).toEqual({ in: ['high', 'critical'] });
  });

  it('AC2d — date range filter applied for from/to', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    const from = '2024-01-01T00:00:00.000Z';
    const to = '2024-12-31T23:59:59.999Z';
    await tasksService.list(USER_A, { ...defaultListQuery, from, to });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.startDate).toEqual({ gte: new Date(from) });
    expect(callArgs.where.endDate).toEqual({ lte: new Date(to) });
  });

  it('AC2e — q (search) filter applied on title and description', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    await tasksService.list(USER_A, { ...defaultListQuery, q: 'deploy' });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toEqual([
      { title: { contains: 'deploy', mode: 'insensitive' } },
      { description: { contains: 'deploy', mode: 'insensitive' } },
    ]);
  });

  it('AC3 — returns nextCursor when more results exist', async () => {
    // Return limit+1 tasks to simulate "has more"
    const tasks = [
      makeDbTask({ id: TASK_1, sortOrder: 0 }),
      makeDbTask({ id: TASK_2, sortOrder: 1 }),
    ];
    // Queried with limit=1, so we get 2 back (limit+1) → has more
    mockPrisma.task.findMany.mockResolvedValue(tasks);

    const result = await tasksService.list(USER_A, { ...defaultListQuery, limit: 1 });

    expect(result.items).toHaveLength(1); // only limit items
    expect(result.nextCursor).toBe(TASK_1); // last item's id
  });

  it('AC3 — nextCursor is null on last page', async () => {
    mockPrisma.task.findMany.mockResolvedValue([makeDbTask()]);

    const result = await tasksService.list(USER_A, { ...defaultListQuery, limit: 25 });

    expect(result.nextCursor).toBeNull();
  });

  it('AC3 — cursor is passed to Prisma findMany', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    await tasksService.list(USER_A, { ...defaultListQuery, cursor: TASK_1 });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.cursor).toEqual({ id: TASK_1 });
    expect(callArgs.skip).toBe(1);
  });

  it('AC4 — sort=priority&order=desc produces DESC priority orderBy (critical first)', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    await tasksService.list(USER_A, { ...defaultListQuery, sort: 'priority', order: 'desc' });

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.orderBy[0]).toEqual({ priority: 'desc' });
  });

  it('AC6 — soft-deleted tasks excluded (deletedAt: null in where clause)', async () => {
    mockPrisma.task.findMany.mockResolvedValue([]);

    await tasksService.list(USER_A, defaultListQuery);

    const callArgs = mockPrisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where.deletedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: tasksService.getById
// ---------------------------------------------------------------------------

describe('tasksService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns task DTO for owned task', async () => {
    const dbTask = makeDbTask({ id: TASK_1, userId: USER_A });
    mockPrisma.task.findFirst.mockResolvedValue(dbTask);

    const task = await tasksService.getById(USER_A, TASK_1);

    expect(task.id).toBe(TASK_1);
    expect(task.user_id).toBe(USER_A);
    expect(task.priority).toBe('medium');
  });

  it('AC5 — returns 404 for another user\'s task (ownership hidden)', async () => {
    // findFirst returns null when scoped to USER_B + TASK_1 (owned by USER_A)
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.getById(USER_B, TASK_1)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 for soft-deleted task', async () => {
    // assertOwnership filters deletedAt: null, so deleted task returns null
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.getById(USER_A, TASK_1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('maps dates to ISO strings in DTO', async () => {
    const start = new Date('2024-06-01T00:00:00.000Z');
    const end = new Date('2024-06-30T00:00:00.000Z');
    mockPrisma.task.findFirst.mockResolvedValue(
      makeDbTask({ startDate: start, endDate: end }),
    );

    const task = await tasksService.getById(USER_A, TASK_1);

    expect(task.start_date).toBe(start.toISOString());
    expect(task.end_date).toBe(end.toISOString());
  });
});
