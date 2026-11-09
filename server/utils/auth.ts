import { type H3Event, createError, getHeader } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

export const loginSchema = z.object({
  email: z.string().trim().email('Escreve um email válido.'),
  password: z.string().min(6, 'A palavra-passe precisa de 6 caracteres ou mais.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export interface AuthenticatedAdmin {
  id: string
  email: string
}

/**
 * Extracts authenticated user claims. Checks SSR cookie session first,
 * then falls back to Authorization: Bearer <token> if present.
 */
export async function getAuthenticatedUser(event: H3Event): Promise<{ id: string, email?: string } | null> {
  try {
    const claims = await serverSupabaseUser(event).catch(() => null)
    if (claims && (claims.sub || claims.id)) {
      return {
        id: (claims.sub || claims.id) as string,
        email: claims.email as string | undefined,
      }
    }

    const authHeader = getHeader(event, 'authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const client = await serverSupabaseClient<Database>(event)
        const { data, error } = await client.auth.getUser(token)
        if (!error && data?.user) {
          return {
            id: data.user.id,
            email: data.user.email,
          }
        }
      }
    }
  }
  catch {
    return null
  }
  return null
}

/**
 * Ensures the request is from an authenticated administrator.
 * Throws 401 if unauthenticated, 403 if authenticated but not in admin_users.
 */
export async function requireAdmin(event: H3Event): Promise<AuthenticatedAdmin> {
  const user = await getAuthenticatedUser(event)
  if (!user || !user.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Autenticação necessária.',
    })
  }

  const serviceRole = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await serviceRole
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Acesso restrito a administradores.',
    })
  }

  return {
    id: data.user_id,
    email: data.email || user.email || '',
  }
}
