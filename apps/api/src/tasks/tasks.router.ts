import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  TaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  ListTasksQuerySchema,
  PaginatedResponseSchema,
} from '@kudo/schemas';
import { requireAuth } from '../middleware/auth.js';
import { tasksService } from './tasks.service.js';

const IdParamSchema = z.object({ id: z.string().uuid() });

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // All task routes require authentication
  app.addHook('preHandler', requireAuth);

  // POST /v1/tasks  (TAL-82)
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

  // GET /v1/tasks  (TAL-83)
  app.get(
    '/',
    {
      schema: {
        querystring: ListTasksQuerySchema,
        response: { 200: PaginatedResponseSchema(TaskSchema) },
      },
    },
    async (req, reply) => {
      const query = req.query as z.infer<typeof ListTasksQuerySchema>;
      const result = await tasksService.list(req.user.id, query);
      return reply.status(200).send(result);
    },
  );

  // GET /v1/tasks/:id  (TAL-83)
  app.get(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        response: { 200: TaskSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      const task = await tasksService.getById(req.user.id, id);
      return reply.status(200).send(task);
    },
  );

  // PATCH /v1/tasks/:id  (TAL-84)
  app.patch(
    '/:id',
    {
      schema: {
        params: IdParamSchema,
        body: UpdateTaskSchema,
        response: { 200: TaskSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      const body = req.body as z.infer<typeof UpdateTaskSchema>;
      const task = await tasksService.update(req.user.id, id, body);
      return reply.status(200).send(task);
    },
  );

  // DELETE /v1/tasks/:id  (TAL-85) — soft-delete; responds 204
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
      await tasksService.softDelete(req.user.id, id);
      return reply.status(204).send();
    },
  );

  // POST /v1/tasks/:id/restore  (TAL-85) — undo soft-delete within 30-day window
  app.post(
    '/:id/restore',
    {
      schema: {
        params: IdParamSchema,
        response: { 200: TaskSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params as z.infer<typeof IdParamSchema>;
      const task = await tasksService.restore(req.user.id, id);
      return reply.status(200).send(task);
    },
  );
}
