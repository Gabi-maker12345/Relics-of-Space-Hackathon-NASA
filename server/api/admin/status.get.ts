import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  return {
    ok: true,
    admin,
    timestamp: new Date().toISOString(),
  }
})
