import { createError, defineEventHandler, readBody, setResponseHeader } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { loginSchema } from '../../utils/auth'
import { checkLoginRateLimit, resetLoginRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: parsed.error.issues[0]?.message || 'Dados de login inválidos.',
    })
  }

  const { email, password } = parsed.data
  try {
    checkLoginRateLimit(event, email)
  }
  catch (err: any) {
    if (err.headers?.['Retry-After']) {
      setResponseHeader(event, 'Retry-After', err.headers['Retry-After'])
    }
    throw createError({
      statusCode: err.statusCode || 429,
      statusMessage: err.statusMessage || 'Too Many Requests',
      message: err.message || 'Demasiadas tentativas de login. Tenta novamente mais tarde.',
    })
  }

  const supabase = await serverSupabaseClient<Database>(event)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Credenciais incorrectas.',
    })
  }

  // Ensure the user is registered in admin_users
  const serviceRole = serverSupabaseServiceRole<Database>(event)
  const { data: adminRecord, error: adminError } = await serviceRole
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (adminError || !adminRecord) {
    // Authenticated user is not an admin: clear session and reject
    await supabase.auth.signOut().catch(() => {})
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Acesso restrito a administradores.',
    })
  }

  resetLoginRateLimit(event, email)
  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
    },
  }
})
