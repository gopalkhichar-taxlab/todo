import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TaskSchema, CreateTaskSchema } from '@kudo/schemas';
import { requireAuth } from '../middleware/auth.js';
import { tasksService } from './tasks.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // All task routes require authentication
  app.addHook('preHandler', requireAuth);

  // POST /v1/tasks
  app.post(
    '/',
    {
      schema: {
        body: CreateTaskSchema,
        response: { 201: TaskSchema },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof CreateTaskSchema>;
      const task = await tasksService.create(req.user.id, body);
      return reply.status(201).send(task);
    },
  );

  // PATCH /v1/tasks/:id — implemented in TAL-84 (same router file, extended there)
  app.patch(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        body: z.object({}).passthrough(),
        response: { 200: TaskSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      // Lazy import of UpdateTaskSchema to avoid circular dep issues
      const { UpdateTaskSchema } = await import('@kudo/schemas');
      const body = UpdateTaskSchema.parse(req.body);
      const task = await tasksService.update(req.user.id, id, body);
      return reply.status(200).send(task);
    },
  );
}
