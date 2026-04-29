import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SignupBodySchema, LoginBodySchema, UserDtoSchema } from '@kudo/schemas';
import { authService } from './auth.service.js';
import { requireAuth } from '../middleware/auth.js';

const AuthResponseSchema = z.object({
  user: UserDtoSchema,
  token: z.string(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/auth/signup
  app.post(
    '/signup',
    {
      schema: {
        body: SignupBodySchema,
        response: {
          201: AuthResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof SignupBodySchema>;
      const user = await authService.signup(body);

      const token = app.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '7d' },
      );

      return reply.status(201).send({ user, token });
    },
  );

  // POST /v1/auth/login
  app.post(
    '/login',
    {
      schema: {
        body: LoginBodySchema,
        response: {
          200: AuthResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof LoginBodySchema>;
      const ip = req.ip ?? '0.0.0.0';
      const user = await authService.login(body, ip);

      const token = app.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '7d' },
      );

      return reply.status(200).send({ user, token });
    },
  );

  // POST /v1/auth/logout — client drops the token; server just responds 204
  app.post(
    '/logout',
    {
      schema: {
        response: {
          204: z.null(),
        },
      },
    },
    async (_req, reply) => {
      return reply.status(204).send();
    },
  );

  // GET /v1/auth/me — requires valid Bearer token
  app.get(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        response: {
          200: UserDtoSchema,
        },
      },
    },
    async (req, reply) => {
      const user = await authService.findById(req.user.id);
      if (!user) {
        throw Object.assign(new Error('User not found'), {
          statusCode: 404,
          code: 'NOT_FOUND',
        });
      }
      return reply.status(200).send(user);
    },
  );
}
