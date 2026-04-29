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
const OTHER_USER_ID = 'aabbccdd-0000-0000-0000-000000000099';

function makeDbTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TASK_ID,
    userId: USER_ID,
    strategyId: null,
    title: 'Original Title',
    description: null,
    priority: 'medium' as const,
    status: 'todo' as const,
    startDate: null,
    endDate: null,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: tasksService.update
// ---------------------------------------------------------------------------

describe('tasksService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates title and returns updated DTO', async () => {
    const updated = makeDbTask({ title: 'Updated Title' });
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask());
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      title: 'Updated Title',
    });

    expect(result.title).toBe('Updated Title');
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: expect.objectContaining({ title: 'Updated Title' }),
      }),
    );
  });

  it('updates priority and status', async () => {
    const updated = makeDbTask({ priority: 'high', status: 'in_progress' });
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask());
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      priority: 'high',
      status: 'in_progress',
    });

    expect(result.priority).toBe('high');
    expect(result.status).toBe('in_progress');
  });

  it('updates sort_order', async () => {
    const updated = makeDbTask({ sortOrder: 7 });
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask());
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      sort_order: 7,
    });

    expect(result.sort_order).toBe(7);
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 7 }),
      }),
    );
  });

  it('updates start_date and end_date (ISO string → Date → ISO string)', async () => {
    const startDate = new Date('2024-07-01T00:00:00.000Z');
    const endDate = new Date('2024-07-31T00:00:00.000Z');
    const updated = makeDbTask({ startDate, endDate });
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask());
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      start_date: '2024-07-01T00:00:00.000Z',
      end_date: '2024-07-31T00:00:00.000Z',
    });

    expect(result.start_date).toBe('2024-07-01T00:00:00.000Z');
    expect(result.end_date).toBe('2024-07-31T00:00:00.000Z');
  });

  it('clears start_date when set to null', async () => {
    const updated = makeDbTask({ startDate: null });
    mockPrisma.task.findFirst.mockResolvedValue(
      makeDbTask({ startDate: new Date('2024-01-01') }),
    );
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      start_date: null,
    });

    expect(result.start_date).toBeNull();
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startDate: null }),
      }),
    );
  });

  it('throws 404 when task does not exist', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(
      tasksService.update(USER_ID, TASK_ID, { title: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('throws 404 when task belongs to another user (cross-user isolation)', async () => {
    // findFirst scoped by userId — if different user, returns null
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(
      tasksService.update(OTHER_USER_ID, TASK_ID, { title: 'Hack' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws 404 when task is soft-deleted', async () => {
    // assertOwnership filters deletedAt: null → soft-deleted task not found
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(
      tasksService.update(USER_ID, TASK_ID, { status: 'done' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('only updates provided fields (partial update)', async () => {
    const original = makeDbTask();
    const updated = makeDbTask({ description: 'New description' });
    mockPrisma.task.findFirst.mockResolvedValue(original);
    mockPrisma.task.update.mockResolvedValue(updated);

    await tasksService.update(USER_ID, TASK_ID, {
      description: 'New description',
    });

    const updateCall = mockPrisma.task.update.mock.calls[0]?.[0];
    // title should NOT be present in the data since it wasn't provided
    expect(updateCall?.data).not.toHaveProperty('title');
    expect(updateCall?.data).toHaveProperty('description', 'New description');
  });

  it('assigns task to a strategy via strategy_id', async () => {
    const strategyId = 'aabbccdd-0000-0000-0000-000000000002';
    const updated = makeDbTask({ strategyId });
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask());
    mockPrisma.task.update.mockResolvedValue(updated);

    const result = await tasksService.update(USER_ID, TASK_ID, {
      strategy_id: strategyId,
    });

    expect(result.strategy_id).toBe(strategyId);
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ strategyId }),
      }),
    );
  });
});
