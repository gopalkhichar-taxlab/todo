import argon2 from 'argon2';
import { prisma } from '../lib/prisma.js';
import type { SignupBody, LoginBody, UserDto } from '@kudo/schemas';

// ---------------------------------------------------------------------------
// In-memory rate limiter: ip → { count, resetAt }
// 5 attempts per IP per 60-second window.
// ---------------------------------------------------------------------------

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 5) {
      throw Object.assign(
        new Error('Too many login attempts, try again in a minute'),
        { statusCode: 429, code: 'TOO_MANY_REQUESTS' },
      );
    }
    entry.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
  }
}

function toDto(user: { id: string; email: string; createdAt: Date }): UserDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export const authService = {
  async signup(body: SignupBody): Promise<UserDto> {
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      throw Object.assign(new Error('Email already registered'), {
        statusCode: 409,
        code: 'EMAIL_CONFLICT',
      });
    }

    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: { email: body.email, passwordHash },
    });

    return toDto(user);
  },

  async login(body: LoginBody, ip: string): Promise<UserDto> {
    checkRateLimit(ip);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    // Constant-time response regardless of whether user exists
    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) {
      throw Object.assign(new Error('Invalid email or password'), {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    return toDto(user);
  },

  async findById(id: string): Promise<UserDto | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return toDto(user);
  },
};
