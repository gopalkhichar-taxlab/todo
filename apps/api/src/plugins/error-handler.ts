import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';

/**
 * Normalizes every error response into a stable shape:
 *   { code: string, message: string, details?: unknown }
 *
 * - ZodError       → 400 VALIDATION_ERROR with field-level details
 * - HTTP errors    → use their statusCode + a SCREAMING_SNAKE code derived
 *                    from the error name
 * - Anything else  → 500 INTERNAL_ERROR (message is hidden in production)
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof ZodError) {
      req.log.warn({ err: err.flatten() }, 'validation error');
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      });
    }

    const fastifyErr = err as FastifyError;
    const status = fastifyErr.statusCode ?? 500;

    if (status >= 500) {
      req.log.error({ err }, 'unhandled error');
    } else {
      req.log.warn({ err }, 'request failed');
    }

    const code =
      fastifyErr.code ??
      (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');

    const message =
      status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Unknown error';

    return reply.status(status).send({ code, message });
  });

  app.setNotFoundHandler((req, reply) => {
    return reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    });
  });
}
