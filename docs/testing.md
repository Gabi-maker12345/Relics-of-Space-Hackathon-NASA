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
| `tests/seed.test.ts` | The demo catalogue: 12 relics, unique ids/slugs, fact sheets, official media with credits/sources, every image present as a 1600×900 JPEG, narration MP3s for every intro/scene, `reference_url`/`is_extra` on every relic, and the SSR fallback matching `data/relics.json` (cover, scenes, steps). |
| `tests/quiz.test.ts` | Quiz input/patch schemas (2–5 options, answer index in range, UUIDs for ordering), the 8-question cap and the DTO guarantee: the public mapper omits `correct_index`, the admin mapper includes it. |
| `tests/narration-timing.test.ts` | Word timings for captions: character offsets, punctuation pauses and the active word at a given time. |
| `tests/relic-filters.test.ts` | FE-05 query filters: valid location/status/search, unknown values dropped, empty values removed and URL query round-trip. |
| `tests/relics-ui.test.ts` | UI helpers: video URL detection, status/location labels, published default and extra flag. |
| `tests/media-paths.test.ts` | Storage path conventions: `assets/...` prefix, slugification, base from env/project URL and absolute URL conversion. |
| `tests/nasa.test.ts` | NASA client: credit normalization (`JPL` → `NASA/JPL-Caltech`, unknown creators preserved), image/video/poster selection, search normalization that filters audio, and clear 400/502 errors. |

## Integration tests (local Supabase required)

Integration tests run against a local Supabase stack.

Prerequisites:
- Docker running
- Supabase CLI available (`npx supabase`)
- `.env` configured for local Supabase (`npx supabase status`)
- `psql` (optional, but required to exercise the second seed run that proves
  idempotency; on Debian/Ubuntu: `sudo apt install postgresql-client`)

Run:
```bash
npm run supabase:start
npm run test:integration
```

`test:integration` first runs `npm run seed:check`, then `supabase db reset`
(applies migrations + seed), applies `supabase/seed.sql` a second time through
`psql` when available, and finally runs `vitest run tests/integration`. If
`SUPABASE_DB_URL` is not set it uses the default local URL
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

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
- `tests/integration/seed.test.ts` — after the reset and a second seed run, the 12 demo
  relics exist exactly once, with their covers, fact sheets, media counts, credits and
  sources; anon can read all published relics.
- `tests/integration/quiz.test.ts` — adding, inserting at a position, updating, reordering
  and deleting questions; the eight-question cap; out-of-range answers after shrinking the
  options; partial/duplicate/foreign order lists; translations cascade on delete; and the
  public detail omits `correct_index` while the admin payload includes it.
- `tests/integration/nasa-import.test.ts` — importing an image and a video from fake NASA
  responses: the medium/mobile asset is referenced, the poster/credit/source are filled,
  the video is muted by default and audio items are rejected.

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

## Admin UI (manual, before the demo)

- Edit an existing relic → **Importar da NASA**: search, switch filters, use
  **Carregar mais** and import an image and a video.
- Confirm the scene appears in the media manager with credit and source, and
  that it survives saving the form.
- Open a new relic and confirm the NASA button is disabled with the “save
  first” hint.
- Close the dialog with Esc, the X button and a click on the backdrop.

## CI

The main CI workflow runs `npm ci`, the runtime audit (`--audit-level=high`),
lint, seed/narration checks, typecheck and unit tests. Integration tests are
opt-in in CI (set `RUN_INTEGRATION_TESTS=1`) because they require Docker and a
Supabase stack.

## Dependency audit (SEC #71)

```bash
npm audit --omit=dev   # runtime tree
npm audit              # includes dev/test tooling
```

Both should report **7 low, 0 moderate, 0 high, 0 critical**. The only root
finding is `deepmerge@4.3.1` (prototype poisoning) pulled in by
`@rollup/plugin-node-resolve` → `nitropack` at build time; there is no fixed
release yet, and the remaining entries derive from that chain. Run the audit
after any dependency bump; the full audit also covers happy-dom and the
TypeScript ESLint packages. See `docs/deploy-checklist.md` §7 for the residual
risk.
