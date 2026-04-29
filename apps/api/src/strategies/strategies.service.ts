import { prisma } from '../lib/prisma.js';
import type { CreateStrategy, UpdateStrategy, Strategy } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type PrismaStrategy = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  color: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
};

function toDto(s: PrismaStrategy): Strategy {
  return {
    id: s.id,
    user_id: s.userId,
    name: s.name,
    description: s.description,
    color: s.color,
    status: s.status,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

async function assertOwnership(
  userId: string,
  strategyId: string,
): Promise<PrismaStrategy> {
  const strategy = await prisma.strategy.findFirst({
    where: { id: strategyId, userId },
  });
  if (!strategy) {
    throw Object.assign(new Error('Strategy not found'), {
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }
  return strategy as PrismaStrategy;
}

async function assertUniqueName(
  userId: string,
  name: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.strategy.findFirst({
    where: {
      userId,
      name: { equals: name, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (conflict) {
    throw Object.assign(
      new Error(`A strategy named "${name}" already exists`),
      { statusCode: 409, code: 'STRATEGY_NAME_CONFLICT' },
    );
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const strategiesService = {
  async create(userId: string, body: CreateStrategy): Promise<Strategy> {
    await assertUniqueName(userId, body.name);

    const strategy = await prisma.strategy.create({
      data: {
        userId,
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? '#3B82F6',
        status: body.status ?? 'active',
      },
    });

    return toDto(strategy as PrismaStrategy);
  },

  async list(
    userId: string,
    statusFilter: 'active' | 'archived' | 'all' = 'active',
  ): Promise<Strategy[]> {
    const where =
      statusFilter === 'all'
        ? { userId }
        : { userId, status: statusFilter as 'active' | 'archived' };

    const strategies = await prisma.strategy.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
    });

    return strategies.map((s) => toDto(s as PrismaStrategy));
  },

  async getById(userId: string, id: string): Promise<Strategy> {
    const strategy = await assertOwnership(userId, id);
    return toDto(strategy);
  },

  async update(
    userId: string,
    id: string,
    body: UpdateStrategy,
  ): Promise<Strategy> {
    await assertOwnership(userId, id);

    if (body.name !== undefined) {
      await assertUniqueName(userId, body.name, id);
    }

    const updated = await prisma.strategy.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return toDto(updated as PrismaStrategy);
  },

  async archive(userId: string, id: string): Promise<void> {
    await assertOwnership(userId, id);

    await prisma.strategy.update({
      where: { id },
      data: { status: 'archived' },
    });
  },
};
