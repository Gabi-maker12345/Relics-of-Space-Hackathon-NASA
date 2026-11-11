# Testing

## Unit tests

```bash
npm run test
npm run test:watch
```

Unit tests are pure Node tests — no Supabase stack required:

| File | Covers |
|---|---|
| `tests/schema.test.ts` | Migration/seed conventions: unique ordered filenames, RLS enabled per table, seed idempotency. |
| `tests/auth.test.ts` | Login schema, session/token extraction, `requireAdmin`, the `/api/admin` middleware and auth endpoints. |
| `tests/upload.test.ts` | Upload rules: kind/MIME/size validation, extension by MIME, `relicId` normalisation, storage path safety, and a guard that the bucket `allowed_mime_types` matches the rules in `server/utils/upload.ts`. |

## Integration tests (local Supabase required)

Integration tests run against a local Supabase stack and exercise RLS at the
database level.

Prerequisites:
- Docker running
- Supabase CLI available (`npx supabase`)
- `.env` configured for local Supabase (`npx supabase status`)

Run:
```bash
npm run supabase:start
npm run test:integration
```

`test:integration` runs `supabase db reset` (applies migrations + seed) and then
`vitest run tests/integration`.

Current coverage (`tests/integration/rls.test.ts`):
- anon can read published relics;
- anon cannot insert relics.

`db reset` wipes `admin_users` — run `npm run setup:admin` afterwards before
using the admin endpoints.

## End-to-end smoke test (dev server + local Supabase)

```bash
npm run dev          # in another terminal
npm run setup:admin
npm run smoke
```

`scripts/smoke.mjs` checks public reads, login/session cookies, `/api/auth/me`,
the admin guard, publish/unpublish visibility and that anon cannot insert.

## CI

The main CI workflow runs lint, typecheck and unit tests. Integration tests are
opt-in in CI (set `RUN_INTEGRATION_TESTS=1`) because they require Docker and a
Supabase stack.
