import { defineEventHandler } from 'h3'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const admin = await requireAdmin(event)
    return {
      authenticated: true,
      user: admin,
    }
  }
  catch {
    return {
      authenticated: false,
      user: null,
    }
  }
})
