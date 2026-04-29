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
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { tasksService } from '../src/tasks/tasks.service.js';
import { purgeDeletedTasks } from '../src/jobs/purge-deleted.job.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPrisma = prisma as {
  task: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const TASK_ID = 'task0001-0000-0000-0000-000000000001';

function makeDbTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TASK_ID,
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

// ---------------------------------------------------------------------------
// Tests: tasksService.softDelete
// ---------------------------------------------------------------------------

describe('tasksService.softDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1 — soft-deletes owned task (sets deletedAt, returns void)', async () => {
    const dbTask = makeDbTask();
    mockPrisma.task.findFirst.mockResolvedValue(dbTask);
    mockPrisma.task.update.mockResolvedValue({ ...dbTask, deletedAt: new Date() });

    await expect(tasksService.softDelete(USER_A, TASK_ID)).resolves.toBeUndefined();

    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('AC4 — cross-user DELETE returns 404; deletedAt NOT set', async () => {
    // USER_B cannot own TASK_ID (owned by USER_A) → findFirst returns null
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.softDelete(USER_B, TASK_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('AC1 — subsequent call on already-deleted task returns 404', async () => {
    // assertOwnership excludes deletedAt != null rows
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.softDelete(USER_A, TASK_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: tasksService.restore
// ---------------------------------------------------------------------------

describe('tasksService.restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC2 — restore within 30 days clears deletedAt and returns task DTO', async () => {
    const deletedAt = new Date(Date.now() - 5 * 86_400_000); // 5 days ago
    const dbTask = makeDbTask({ deletedAt });
    mockPrisma.task.findFirst.mockResolvedValue(dbTask);

    const restoredDb = makeDbTask({ deletedAt: null });
    mockPrisma.task.update.mockResolvedValue(restoredDb);

    const task = await tasksService.restore(USER_A, TASK_ID);

    expect(task.deleted_at).toBeNull();
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: { deletedAt: null },
      }),
    );
  });

  it('AC3 — restore after 30d window returns 410 Gone', async () => {
    const deletedAt = new Date(Date.now() - 31 * 86_400_000); // 31 days ago
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask({ deletedAt }));

    await expect(tasksService.restore(USER_A, TASK_ID)).rejects.toMatchObject({
      statusCode: 410,
      code: 'GONE',
    });

    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('returns 404 when task does not exist or cross-user', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null);

    await expect(tasksService.restore(USER_B, TASK_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 400 when task exists but is not deleted', async () => {
    // Task is live (deletedAt: null) — restoring a non-deleted task is invalid
    mockPrisma.task.findFirst.mockResolvedValue(makeDbTask({ deletedAt: null }));

    await expect(tasksService.restore(USER_A, TASK_ID)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: purgeDeletedTasks job
// ---------------------------------------------------------------------------

describe('purgeDeletedTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hard-deletes tasks older than retention window and returns count', async () => {
    mockPrisma.task.deleteMany.mockResolvedValue({ count: 3 });

    const count = await purgeDeletedTasks(30);

    expect(count).toBe(3);
    const callArgs = mockPrisma.task.deleteMany.mock.calls[0][0];
    // The cutoff date should be approximately 30 days ago
    const cutoff = callArgs.where.deletedAt.lt as Date;
    const expectedCutoff = new Date(Date.now() - 30 * 86_400_000);
    // Allow 5-second tolerance for test execution time
    expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(5_000);
  });

  it('returns 0 when nothing to purge', async () => {
    mockPrisma.task.deleteMany.mockResolvedValue({ count: 0 });

    const count = await purgeDeletedTasks();

    expect(count).toBe(0);
  });
});
