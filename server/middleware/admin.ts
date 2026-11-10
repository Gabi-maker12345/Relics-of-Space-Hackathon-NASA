import { defineEventHandler } from 'h3'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (path === '/api/admin' || path.startsWith('/api/admin/')) {
    await requireAdmin(event)
  }
})
