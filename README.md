# KUDO — Strategic Task Management (MVP)

Monorepo for the KUDO MVP. A focused tool that ties every task to a strategic objective so you can see, at a glance, whether your day is moving the needle.

## Stack

| Layer       | Tech                                                            |
| ----------- | --------------------------------------------------------------- |
| Web         | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS     |
| API         | Fastify 4, TypeScript, Zod, Prisma                              |
| DB          | PostgreSQL 16                                                   |
| Auth        | JWT (access + refresh) — session table for refresh rotation     |
| Tooling     | pnpm workspaces, ESLint, Prettier, Vitest                       |
| CI          | GitHub Actions (lint, typecheck, test, build)                   |

## Layout

```
todo/
├── apps/
│   ├── api/              Fastify + Prisma backend
│   └── web/              Next.js 15 frontend
├── packages/
│   ├── schemas/          Shared Zod contracts (request/response)
│   └── tsconfig/         Shared TypeScript configs
├── docker-compose.yml    Local Postgres
├── pnpm-workspace.yaml
└── package.json          Root scripts
```

## Quick start

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure env
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 4. Run Prisma migrations (after the DB schema story lands)
pnpm --filter @kudo/api prisma migrate dev

# 5. Run everything in dev mode
pnpm dev
```

API → http://localhost:3001 · Web → http://localhost:3000

## Scripts

| Script        | Effect                                            |
| ------------- | ------------------------------------------------- |
| `pnpm dev`    | Run API and Web concurrently in dev mode         |
| `pnpm build`  | Production build of every workspace              |
| `pnpm lint`   | ESLint across the monorepo                       |
| `pnpm test`   | Vitest across the monorepo                       |
| `pnpm typecheck` | `tsc --noEmit` across the monorepo            |

## Architecture cheat-sheet

- **Strategies** are user-owned objectives (max 5 active). Tasks are tied to one strategy.
- **Tasks** carry priority (P0–P3), status (todo / doing / done), and a due date.
- **Auth** is JWT with refresh rotation; access tokens are 15 min, refresh tokens 30 days.
- **Validation**: every API route uses a Zod schema imported from `@kudo/schemas`. The web client imports the same package for form validation.
- **Errors**: API normalizes errors into `{ code, message, details? }` via the global error plugin. The web app surfaces `code` to drive UI behavior.

See the architect's design comment on [TAL-77](https://gkforge.atlassian.net/browse/TAL-77) for the full design.

## Contributing

- Each Jira story has a `path_globs` declaration. Stay inside your globs unless the architect updates them.
- Open a PR against `main`. The architect reviews and merges; serial merges only.
- `main` must stay green: lint + typecheck + test all pass in CI.
