import { defineEventHandler } from 'h3'
import { requireAdmin } from '../utils/auth'

export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/admin')) {
    await requireAdmin(event)
  }
})
