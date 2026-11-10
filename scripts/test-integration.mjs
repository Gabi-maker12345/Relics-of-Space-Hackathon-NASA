#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { loadEnvFile } from 'node:process'

try {
  loadEnvFile()
}
catch {
  /* ignore */
}

const run = (cmd, args) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true })
  p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))
})

async function main() {
  if (process.env.CI && !process.env.RUN_INTEGRATION_TESTS) {
    console.log('Skipping integration tests (set RUN_INTEGRATION_TESTS=1 to enable in CI)')
    process.exit(0)
  }

  console.log('Resetting Supabase local database...')
  await run('npx', ['supabase', 'db', 'reset'])
  console.log('Running integration tests...')
  await run('npx', ['vitest', 'run', 'tests/integration'])
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
