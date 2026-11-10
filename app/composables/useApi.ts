import type { NitroFetchOptions } from 'nitropack'

export function useApi() {
  const get = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'GET', ...(options as Record<string, unknown>) })
  const post = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'POST', body: body as any, ...(options as Record<string, unknown>) })
  const put = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'PUT', body: body as any, ...(options as Record<string, unknown>) })
  const del = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'DELETE', ...(options as Record<string, unknown>) })

  return { get, post, put, del }
}
