/**
 * @kudo/schemas — single source of truth for request/response shapes.
 *
 * Both apps/api (Fastify route validation) and apps/web (form + client
 * validation) import from this package. Feature stories add their domain
 * schemas here; never inline a Zod schema in the API or UI.
 */

export * from './common.js';
export * from './task.js';
export * from './strategy.js';
