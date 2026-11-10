import type { NitroFetchOptions } from 'nitropack'

export function useApi() {
  const get = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'GET', ...(options as object) })
  const post = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'POST', body: body as Record<string, unknown>, ...(options as object) })
  const put = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'PUT', body: body as Record<string, unknown>, ...(options as object) })
  const del = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'DELETE', ...(options as object) })

  return { get, post, put, del }
}
