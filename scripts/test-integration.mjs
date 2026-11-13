#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { loadEnvFile } from 'node:process'

try {
  loadEnvFile()
}
catch {
  /* ignore */
}

const dbUrl = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true })
  p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))
})

async function main() {
  if (process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
    console.log('Skipping integration tests (set RUN_INTEGRATION_TESTS=1 to enable in CI)')
    process.exit(0)
  }

  console.log('Checking that supabase/seed.sql matches data/relics.json...')
  await run('node', ['scripts/generate-seed.mjs', '--check'])

  console.log('Resetting Supabase local database...')
  await run('npx', ['supabase', 'db', 'reset'])

  const hasPsql = spawnSync('psql', ['--version'], { stdio: 'ignore' }).status === 0
  if (hasPsql) {
    console.log('Re-applying the seed to prove that a second run does not duplicate data...')
    await run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', 'supabase/seed.sql'])
  }
  else {
    console.log('psql not found: skipping the second seed run. Install postgresql-client to cover idempotency locally.')
  }

  console.log('Running integration tests...')
  await run('npx', ['vitest', 'run', 'tests/integration'])
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
