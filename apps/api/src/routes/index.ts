import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { authRoutes } from '../auth/auth.router.js';
import { strategyRoutes } from '../strategies/strategies.router.js';

/**
 * Top-level route registrar. Each feature story registers its own router here:
 *   - TAL-79  → authRoutes (auth/*)
 *   - TAL-82+ → taskRoutes (tasks/*)
 *   - TAL-86  → strategyRoutes (strategies/*)
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  // Versioned API surface. Feature stories mount under /v1.
  await app.register(
    async (v1) => {
      v1.get('/', async () => ({ name: 'kudo-api', version: '0.1.0' }));

      // TAL-79: auth
      await v1.register(authRoutes, { prefix: '/auth' });

      // TAL-86: strategies CRUD
      await v1.register(strategyRoutes, { prefix: '/strategies' });
    },
    { prefix: '/v1' },
  );
}
