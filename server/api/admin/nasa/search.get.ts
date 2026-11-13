import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { requireAdmin } from '../../../utils/auth'
import { NasaApiError, nasaSearchSchema, searchNasa } from '../../../utils/nasa'

/**
 * Proxies the official NASA Image and Video Library so the admin can search
 * without exposing a key (the API is public) and without CORS issues.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parsed = nasaSearchSchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || 'Pesquisa inválida.' })
  }

  try {
    const result = await searchNasa({
      q: parsed.data.q,
      mediaType: parsed.data.media_type,
      page: parsed.data.page,
      pageSize: parsed.data.page_size,
    })

    setHeader(event, 'Cache-Control', 'private, max-age=60')
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    }
  }
  catch (error) {
    if (error instanceof NasaApiError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw createError({ statusCode: 502, message: 'Falha ao contactar a NASA.' })
  }
})
