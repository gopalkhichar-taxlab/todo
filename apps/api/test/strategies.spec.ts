import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma before importing service so the module uses the mock.
// ---------------------------------------------------------------------------

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    strategy: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { strategiesService } from '../src/strategies/strategies.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPrisma = prisma as {
  strategy: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = 'aabbccdd-0000-0000-0000-000000000001';
const STRATEGY_ID = 'aabbccdd-0000-0000-0000-000000000002';

function makeDbStrategy(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: STRATEGY_ID,
    userId: USER_ID,
    name: 'Test Strategy',
    description: null,
    color: '#3B82F6',
    status: 'active' as const,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('strategiesService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a strategy and returns DTO', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null); // no name conflict
    mockPrisma.strategy.create.mockResolvedValue(makeDbStrategy());

    const result = await strategiesService.create(USER_ID, {
      name: 'Test Strategy',
      color: '#3B82F6',
      status: 'active',
    });

    expect(result).toMatchObject({
      id: STRATEGY_ID,
      user_id: USER_ID,
      name: 'Test Strategy',
      status: 'active',
    });

    expect(mockPrisma.strategy.create).toHaveBeenCalledOnce();
  });

  it('throws 409 when name conflicts (case-insensitive)', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(makeDbStrategy());

    await expect(
      strategiesService.create(USER_ID, {
        name: 'TEST STRATEGY',
        color: '#3B82F6',
        status: 'active',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'STRATEGY_NAME_CONFLICT' });

    expect(mockPrisma.strategy.create).not.toHaveBeenCalled();
  });
});

describe('strategiesService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only active strategies by default', async () => {
    const active = makeDbStrategy({ status: 'active' });
    mockPrisma.strategy.findMany.mockResolvedValue([active]);

    const results = await strategiesService.list(USER_ID, 'active');

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('active');
    expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: 'active' },
      }),
    );
  });

  it('returns all strategies when status=all', async () => {
    mockPrisma.strategy.findMany.mockResolvedValue([
      makeDbStrategy({ status: 'active' }),
      makeDbStrategy({ id: 'other-id', status: 'archived' }),
    ]);

    const results = await strategiesService.list(USER_ID, 'all');
    expect(results).toHaveLength(2);
    expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });
});

describe('strategiesService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the strategy when user owns it', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(makeDbStrategy());

    const result = await strategiesService.getById(USER_ID, STRATEGY_ID);
    expect(result.id).toBe(STRATEGY_ID);
    expect(result.user_id).toBe(USER_ID);
  });

  it('throws 404 when strategy belongs to another user', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      strategiesService.getById(USER_ID, STRATEGY_ID),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

describe('strategiesService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates allowed fields and returns updated DTO', async () => {
    const updated = makeDbStrategy({ name: 'Renamed', color: '#FF0000' });
    // First call: assertOwnership, second call: assertUniqueName
    mockPrisma.strategy.findFirst
      .mockResolvedValueOnce(makeDbStrategy())
      .mockResolvedValueOnce(null);
    mockPrisma.strategy.update.mockResolvedValue(updated);

    const result = await strategiesService.update(USER_ID, STRATEGY_ID, {
      name: 'Renamed',
      color: '#FF0000',
    });

    expect(result.name).toBe('Renamed');
    expect(result.color).toBe('#FF0000');
  });

  it('throws 404 when strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      strategiesService.update(USER_ID, STRATEGY_ID, { name: 'X' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('strategiesService.archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets status to archived', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(makeDbStrategy());
    mockPrisma.strategy.update.mockResolvedValue(
      makeDbStrategy({ status: 'archived' }),
    );

    await expect(
      strategiesService.archive(USER_ID, STRATEGY_ID),
    ).resolves.toBeUndefined();

    expect(mockPrisma.strategy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'archived' },
      }),
    );
  });

  it('throws 404 when strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      strategiesService.archive(USER_ID, STRATEGY_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
