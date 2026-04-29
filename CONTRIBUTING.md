# Contributing to KUDO

## Workflow

1. Pick up the Jira story assigned to you (TAL-XX). Read the architect's design comment on TAL-77 first.
2. Create a feature branch off `main`:
   ```bash
   git checkout -b feat/TAL-XX-short-description
   ```
3. Stay inside the `path_globs` declared on your story. If you need to touch a file outside your globs, ping the architect first — overlapping changes break the merge train.
4. Open a PR. Reference the Jira key in the title (`TAL-XX: …`).
5. The architect reviews. On approval, the architect merges to `main` (no fast-forward). Merges are serial — wait your turn.
6. CI must be green before merge: `lint`, `typecheck`, `test`, `build`.

## Commit style

Conventional Commits, prefixed with the Jira key:

```
feat(TAL-82): add POST /v1/tasks endpoint
fix(TAL-79): rotate refresh token on every use
chore(TAL-78): bump pnpm to 9.12
```

## Local dev

See [README.md](./README.md#quick-start). Make sure Docker is running before `pnpm dev`.

## Testing

- API: Vitest + Fastify's `inject()` for HTTP-level tests. Use a separate `kudo_test` database.
- Web: Vitest + Testing Library for components. Playwright e2e lands later.

## Code style

- ESLint + Prettier are enforced by CI. Run `pnpm format` before pushing.
- TypeScript is strict — no `any`, no unchecked index access.
- Every API route validates input via a `@kudo/schemas` Zod schema. No inline schemas.
- Errors thrown from routes go through the global error handler — return a typed `code` from the schema.
