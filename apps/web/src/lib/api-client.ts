/**
 * Thin fetch wrapper around the KUDO API. Feature stories add typed
 * resource methods (auth, tasks, strategies) on top of this primitive.
 *
 * The error shape mirrors the API's normalized contract:
 *   { code: string, message: string, details?: unknown }
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  status: number;
}

export class ApiClientError extends Error implements ApiError {
  code: string;
  details?: unknown;
  status: number;

  constructor(err: ApiError) {
    super(err.message);
    this.name = 'ApiClientError';
    this.code = err.code;
    this.details = err.details;
    this.status = err.status;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Override the access token instead of reading from storage. */
  token?: string;
}

export async function apiRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = opts;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const err = (data ?? {}) as Partial<ApiError>;
    throw new ApiClientError({
      code: err.code ?? 'UNKNOWN_ERROR',
      message: err.message ?? `Request failed: ${res.status}`,
      details: err.details,
      status: res.status,
    });
  }

  return data as T;
}
