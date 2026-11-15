import { createError, defineEventHandler, getMethod } from 'h3'
import { requireAdmin } from '../utils/auth'

/**
 * Guarda todas as rotas /api/admin: exige administrador (ou demo) para
 * qualquer método e, na conta demo pública, corta tudo o que não seja leitura.
 * A demo também não tem linha em `admin_users`, por isso o RLS nega as
 * escritas mesmo que alguém chame o Supabase directamente com a sessão demo.
 */
export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (path !== '/api/admin' && !path.startsWith('/api/admin/')) return

  const admin = await requireAdmin(event)
  const method = getMethod(event).toUpperCase()
  const readOnly = method === 'GET' || method === 'HEAD'

  if (admin.isDemo && !readOnly) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Conta demo: só leitura. Nenhuma alteração é guardada.',
    })
  }
})
