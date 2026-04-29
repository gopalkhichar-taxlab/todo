import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client. Routes import this instead of constructing their
 * own — keeps connection pooling sane and lets tests swap it via DI.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export type { PrismaClient };
