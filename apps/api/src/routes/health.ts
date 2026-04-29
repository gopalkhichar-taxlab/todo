import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * GET /health        — liveness. Always 200 unless the process is dying.
 * GET /health/ready  — readiness. Verifies DB connectivity.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch (err) {
      app.log.error({ err }, 'readiness check failed');
      return reply.status(503).send({ status: 'not_ready', code: 'DB_UNAVAILABLE' });
    }
  });
}
