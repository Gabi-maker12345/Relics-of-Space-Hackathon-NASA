#!/usr/bin/env node
/**
 * Bootstrap the first administrator.
 *
 * Requires:
 *   NUXT_PUBLIC_SUPABASE_URL
 *   NUXT_SUPABASE_SECRET_KEY
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *
 * The script is idempotent: running it twice does not duplicate the user.
 */
import { loadEnvFile } from 'node:process'
import { createClient } from '@supabase/supabase-js'

// Allow `npm run setup:admin` to read the local `.env` without extra tooling.
try {
  loadEnvFile()
}
catch {
  // No .env file: fall back to the process environment (CI, Vercel, ...).
}

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const secret = process.env.NUXT_SUPABASE_SECRET_KEY
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

const missing = [
  ['NUXT_PUBLIC_SUPABASE_URL', url],
  ['NUXT_SUPABASE_SECRET_KEY', secret],
  ['ADMIN_EMAIL', email],
  ['ADMIN_PASSWORD', password],
].filter(([, value]) => !value)

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD must have at least 8 characters.')
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
    console.log(`Created auth user: ${email}`)
  }

  const { error: adminError } = await admin
    .from('admin_users')
    .upsert({ user_id: user.id, email }, { onConflict: 'user_id' })

  if (adminError) {
    throw new Error(
      `Could not write admin_users. Did you apply the migrations first?\n${adminError.message}`,
    )
  }

  console.log(`Administrator ready: ${email}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
