#!/usr/bin/env node
/**
 * Create (or refresh) the public demo account.
 *
 * The demo deliberately is NOT inserted into `admin_users`: with no row there,
 * the Postgres RLS (`is_admin()`) denies every write, even if someone logs in
 * to Supabase directly with the published credentials. The server grants it
 * read-only access to /api/admin/** and blocks all non-GET methods.
 *
 * Requires:
 *   NUXT_PUBLIC_SUPABASE_URL
 *   NUXT_SUPABASE_SECRET_KEY
 * Optional overrides: DEMO_EMAIL / DEMO_PASSWORD.
 */
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'

try {
  loadEnvFile()
}
catch {
  // No .env file: fall back to the process environment (CI, Vercel, ...).
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const secret = process.env.NUXT_SUPABASE_SECRET_KEY
const email = (process.env.DEMO_EMAIL ?? 'juiz@gmail.com').trim().toLowerCase()
const password = process.env.DEMO_PASSWORD ?? '12345678'

const missing = [
  ['NUXT_PUBLIC_SUPABASE_URL', url],
  ['NUXT_SUPABASE_SECRET_KEY', secret],
].filter(([, value]) => !value)

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

if (password.length < 8) {
  console.error('DEMO_PASSWORD must have at least 8 characters (the login form requires it).')
  process.exit(1)
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(target) {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find(user => user.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }
}

async function main() {
  let user = await findUserByEmail(email)

  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password })
    if (error) throw error
    console.log(`Updated existing auth user: ${email}`)
  }
  else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user
    if (!user) throw new Error('Supabase did not return the created user.')
    console.log(`Created auth user: ${email}`)
  }

  // Remove qualquer linha de administrador que tenha sobrado: a demo deve
  // ficar sem autorizações para o RLS negar escritas diretas.
  const { error: removeError } = await admin
    .from('admin_users')
    .delete()
    .eq('user_id', user.id)

  if (removeError) throw removeError

  console.log(`Demo pronta (só leitura, sem admin_users): ${email}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
