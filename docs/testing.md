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
| `tests/relic-contract.test.ts` | The front↔API contract: mapper (`id` = slug, cover only from images, no audio fallback), input schema, column mapping (`tagline`→`summary`, `body`→`story_text`), one-field publish patch and the cover-must-be-a-scene rule. |
| `tests/i18n.test.ts` | Language normalization (`en`, `pt-BR`, invalid → `pt`) and the translation payload schema (partial saves, UUIDs, quiz options, safe URLs). |

## Integration tests (local Supabase required)

Integration tests run against a local Supabase stack.

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

Current coverage:
- `tests/integration/rls.test.ts` — anon can read published relics; anon cannot insert.
- `tests/integration/relics.test.ts` — facts/media belong to a relic, the cover must
  be one of its media, renaming keeps the slug and the children, drafts stay hidden
  from anon until published, and deleting a relic cascades.
- `tests/integration/public-relics.test.ts` — public list/detail filters, cache headers,
  localized fields via `?lang=en`, per-field PT fallback and graceful fallback for an
  unsupported language.
- `tests/integration/relic-translations.test.ts` — saving/reading relic, media and quiz
  translations, partial merges that keep other fields, explicit `null` clearing an audio
  URL, and rejection of media/questions that belong to another relic.

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
