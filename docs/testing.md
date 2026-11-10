# Testing

## Unit tests
```bash
npm run test
npm run test:watch
```

## Integration tests (local Supabase required)
Integration tests run against a local Supabase stack and exercise RLS, migrations and seed.

Prerequisites:
- Docker running
- Supabase CLI available (`npx supabase`)
- `.env` configured for local Supabase (`npx supabase status`)

Run:
```bash
npm run supabase:start
npm run test:integration
```

`test:integration` runs `supabase db reset` (applies migrations + seed) and then `vitest run tests/integration`.

## CI
The main CI workflow runs lint, typecheck and unit tests. Integration tests are opt-in in CI (set `RUN_INTEGRATION_TESTS=1`) because they require Docker and a Supabase stack.
