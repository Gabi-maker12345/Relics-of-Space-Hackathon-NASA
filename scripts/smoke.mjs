#!/usr/bin/env node
/**
 * End-to-end smoke test against a running stack.
 *
 * Requires:
 *   NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY, NUXT_SUPABASE_SECRET_KEY
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 *   BASE_URL (default http://127.0.0.1:3000) — the Nuxt server
 *
 * Checks, in order:
 *   1. anon can read published relics through PostgREST;
 *   2. the admin can log in through /api/auth/login;
 *   3. /api/auth/me reflects the session cookie;
 *   4. /api/admin/* rejects anonymous callers;
 *   5. unpublished relics disappear from the anon view;
 *   6. anon cannot insert into relics.
 *
 * Usage: `npm run smoke` (with `npm run dev` and `npx supabase start` running).
 */
import { loadEnvFile } from 'node:process'

try {
  loadEnvFile()
}
catch {
  // No .env file: rely on the process environment.
}

const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '')
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY
const secretKey = process.env.NUXT_SUPABASE_SECRET_KEY
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

const missing = Object.entries({
  NUXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NUXT_PUBLIC_SUPABASE_KEY: anonKey,
  NUXT_SUPABASE_SECRET_KEY: secretKey,
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD: adminPassword,
}).filter(([, value]) => !value)

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

let failures = 0

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`)
    return
  }
  failures += 1
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
}

async function rest(path, { method = 'GET', token = anonKey, body } = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  }
  catch {
    data = text
  }
  return { status: response.status, data }
}

async function main() {
  console.log(`Smoke test · API ${baseUrl} · Supabase ${supabaseUrl}\n`)

  // 1. Public read through RLS.
  const publicRead = await rest('relics?select=slug,published')
  check('anon reads relics', publicRead.status === 200 && Array.isArray(publicRead.data))
  const visible = Array.isArray(publicRead.data) ? publicRead.data : []
  check('seed provided published relics', visible.length > 0, `got ${visible.length}`)
  check('anon sees only published rows', visible.every(row => row.published === true))

  // 2. Admin login.
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const loginBody = await loginResponse.json().catch(() => null)
  check('admin login succeeds', loginResponse.status === 200 && loginBody?.ok === true, `status ${loginResponse.status}`)

  const cookie = (loginResponse.headers.getSetCookie?.() ?? [])
    .map(value => value.split(';')[0])
    .join('; ')
  check('login sets a session cookie', cookie.length > 0)

  // 3. Session round-trip.
  const meResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } })
  const me = await meResponse.json().catch(() => null)
  check('session is recognised', me?.authenticated === true && me?.user?.email === adminEmail)

  // 4. Admin routes stay closed without a session.
  const anonymousAdmin = await fetch(`${baseUrl}/api/admin/status`)
  check('admin route rejects anonymous callers', anonymousAdmin.status === 401, `status ${anonymousAdmin.status}`)

  const authorisedAdmin = await fetch(`${baseUrl}/api/admin/status`, { headers: { cookie } })
  check('admin route accepts the admin session', authorisedAdmin.status === 200, `status ${authorisedAdmin.status}`)

  // 5. Drafts are invisible to anon.
  const target = visible[0]
  if (!target) {
    check('draft visibility', false, 'no relic available to unpublish')
  }
  else {
    const hide = await rest(`relics?slug=eq.${target.slug}`, {
      method: 'PATCH',
      token: secretKey,
      body: { published: false },
    })
    check('admin can unpublish a relic', hide.status === 204 || hide.status === 200, `status ${hide.status}`)

    const afterHide = await rest('relics?select=slug')
    const hidden = Array.isArray(afterHide.data) && !afterHide.data.some(row => row.slug === target.slug)
    check('draft is hidden from anon', hidden)

    const restore = await rest(`relics?slug=eq.${target.slug}`, {
      method: 'PATCH',
      token: secretKey,
      body: { published: true },
    })
    check('relic restored', restore.status === 204 || restore.status === 200, `status ${restore.status}`)
  }

  // 6. RLS blocks anonymous writes.
  const anonymousInsert = await rest('relics', {
    method: 'POST',
    body: { slug: 'smoke-test-should-fail', name: 'Smoke test' },
  })
  check('anon cannot insert relics', anonymousInsert.status === 401 || anonymousInsert.status === 403, `status ${anonymousInsert.status}`)

  console.log('')
  if (failures > 0) {
    console.error(`${failures} check(s) failed.`)
    process.exit(1)
  }
  console.log('All checks passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
