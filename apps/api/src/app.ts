import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import { loadEnv } from './config/env.js';
import { logger } from './lib/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRoutes } from './routes/index.js';

/**
 * Builds a configured Fastify instance. Exported separately from `server.ts`
 * so tests can spin up the app without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();

  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });
  await app.register(sensible);

  // JWT must be registered before routes so req.jwtVerify() is available.
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
  });

  registerErrorHandler(app);
  await registerRoutes(app);

  return app;
}
