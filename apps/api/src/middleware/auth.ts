import type { FastifyRequest, FastifyReply } from 'fastify';

// ---------------------------------------------------------------------------
// Module augmentation — adds req.user to every FastifyRequest.
// ---------------------------------------------------------------------------

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}

/**
 * requireAuth — Fastify preHandler that validates the `Authorization: Bearer
 * <token>` header using @fastify/jwt and populates `req.user`.
 *
 * Throws 401 if the token is missing, expired, or invalid.
 */
export async function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await req.jwtVerify();

    // @fastify/jwt sets req.user to the decoded payload object.
    // We expect { sub: string, email: string } per auth.router.ts sign().
    const payload = req.user as unknown as { sub: string; email: string };

    if (!payload.sub || !payload.email) {
      throw Object.assign(new Error('Invalid token payload'), {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    }

    // Re-assign to the shape declared above
    req.user = { id: payload.sub, email: payload.email };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    // If it already has our shape, rethrow
    if (e.statusCode === 401) throw err;

    // Otherwise normalise jwt errors to 401
    throw Object.assign(
      new Error(e.message ?? 'Unauthorized'),
      { statusCode: 401, code: 'UNAUTHORIZED' },
    );
  }
}
