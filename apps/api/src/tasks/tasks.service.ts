import { prisma } from '../lib/prisma.js';
import type { CreateTask, UpdateTask, Task, ListTasksQuery } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type PrismaTask = {
  id: string;
  userId: string;
  strategyId: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  startDate: Date | null;
  endDate: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function toDto(t: PrismaTask): Task {
  return {
    id: t.id,
    user_id: t.userId,
    strategy_id: t.strategyId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    start_date: t.startDate ? t.startDate.toISOString() : null,
    end_date: t.endDate ? t.endDate.toISOString() : null,
    sort_order: t.sortOrder,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    deleted_at: t.deletedAt ? t.deletedAt.toISOString() : null,
  };
}

/**
 * Computes the next sort_order for a given user+strategy bucket.
 * Tasks within the same bucket are ordered sequentially.
 */
async function nextSortOrder(
  userId: string,
  strategyId: string | null | undefined,
): Promise<number> {
  const last = await prisma.task.findFirst({
    where: {
      userId,
      strategyId: strategyId ?? null,
      deletedAt: null,
    },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

async function assertOwnership(userId: string, taskId: string): Promise<PrismaTask> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId, deletedAt: null },
  });
  if (!task) {
    throw Object.assign(new Error('Task not found'), {
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }
  return task as PrismaTask;
}

// ---------------------------------------------------------------------------
// Ordering helpers  (TAL-83)
// ---------------------------------------------------------------------------

type OrderDir = 'asc' | 'desc';

function buildOrderBy(sort: ListTasksQuery['sort'], order: OrderDir) {
  // Postgres enum order for TaskPriority: low < medium < high < critical
  // so DESC puts critical first (desired behaviour for "sort by priority").
  switch (sort) {
    case 'priority':
      return [{ priority: order }, { createdAt: 'asc' as const }];
    case 'due':
      return [{ endDate: order }, { createdAt: 'asc' as const }];
    case 'sort_order':
      return [{ sortOrder: order }, { createdAt: 'asc' as const }];
    case 'created_at':
      return [{ createdAt: order }];
    default:
      return [{ sortOrder: order }];
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const tasksService = {
  async create(userId: string, body: CreateTask): Promise<Task> {
    const sortOrder =
      body.sort_order !== undefined
        ? body.sort_order
        : await nextSortOrder(userId, body.strategy_id);

    const task = await prisma.task.create({
      data: {
        userId,
        strategyId: body.strategy_id ?? null,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? 'medium',
        status: body.status ?? 'todo',
        startDate: body.start_date ? new Date(body.start_date) : null,
        endDate: body.end_date ? new Date(body.end_date) : null,
        sortOrder,
      },
    });

    return toDto(task as PrismaTask);
  },

  // TAL-83: list tasks with filters, sorting, and cursor pagination
  async list(
    userId: string,
    query: ListTasksQuery,
  ): Promise<{ items: Task[]; nextCursor: string | null }> {
    const { cursor, limit, strategy_id, status, priority, from, to, q, sort, order } = query;

    const where = {
      userId,
      deletedAt: null as null,
      ...(strategy_id ? { strategyId: strategy_id } : {}),
      ...(status?.length ? { status: { in: status } } : {}),
      ...(priority?.length ? { priority: { in: priority } } : {}),
      ...(from ? { startDate: { gte: new Date(from) } } : {}),
      ...(to ? { endDate: { lte: new Date(to) } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { description: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const take = limit + 1; // fetch one extra to detect next page

    const tasks = await prisma.task.findMany({
      where,
      orderBy: buildOrderBy(sort, order),
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = tasks.length > limit;
    const items = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map((t) => toDto(t as PrismaTask)),
      nextCursor,
    };
  },

  // TAL-83: get single task by id (404 if not owned or soft-deleted)
  async getById(userId: string, id: string): Promise<Task> {
    const task = await assertOwnership(userId, id);
    return toDto(task);
  },

  async update(userId: string, id: string, body: UpdateTask): Promise<Task> {
    await assertOwnership(userId, id);

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.start_date !== undefined && {
          startDate: body.start_date ? new Date(body.start_date) : null,
        }),
        ...(body.end_date !== undefined && {
          endDate: body.end_date ? new Date(body.end_date) : null,
        }),
        ...(body.sort_order !== undefined && { sortOrder: body.sort_order }),
        ...(body.strategy_id !== undefined && { strategyId: body.strategy_id }),
      },
    });

    return toDto(updated as PrismaTask);
  },
};
