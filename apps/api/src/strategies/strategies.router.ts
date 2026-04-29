import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  StrategySchema,
  CreateStrategySchema,
  UpdateStrategySchema,
} from '@kudo/schemas';
import { requireAuth } from '../middleware/auth.js';
import { strategiesService } from './strategies.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });
const StatusQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).default('active'),
});

export async function strategyRoutes(app: FastifyInstance): Promise<void> {
  // All strategy routes require authentication
  app.addHook('preHandler', requireAuth);

  // POST /v1/strategies
  app.post(
    '/',
    {
      schema: {
        body: CreateStrategySchema,
        response: { 201: StrategySchema },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof CreateStrategySchema>;
      const strategy = await strategiesService.create(req.user.id, body);
      return reply.status(201).send(strategy);
    },
  );

  // GET /v1/strategies
  app.get(
    '/',
    {
      schema: {
        querystring: StatusQuerySchema,
        response: { 200: z.array(StrategySchema) },
      },
    },
    async (req, reply) => {
      const { status } = req.query as z.infer<typeof StatusQuerySchema>;
      const strategies = await strategiesService.list(req.user.id, status);
      return reply.status(200).send(strategies);
    },
  );

  // GET /v1/strategies/:id
  app.get(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        response: { 200: StrategySchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      const strategy = await strategiesService.getById(req.user.id, id);
      return reply.status(200).send(strategy);
    },
  );

  // PATCH /v1/strategies/:id
  app.patch(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        body: UpdateStrategySchema,
        response: { 200: StrategySchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      const body = req.body as z.infer<typeof UpdateStrategySchema>;
      const strategy = await strategiesService.update(req.user.id, id, body);
      return reply.status(200).send(strategy);
    },
  );

  // DELETE /v1/strategies/:id — soft-delete (sets status=archived)
  app.delete(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      await strategiesService.archive(req.user.id, id);
      return reply.status(204).send();
    },
  );
}
