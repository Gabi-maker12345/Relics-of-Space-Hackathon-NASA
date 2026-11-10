import type { NitroFetchOptions } from 'nitropack'

export function useApi() {
  const get = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'GET', ...options })
  const post = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'POST', body, ...options })
  const put = <T>(url: string, body: unknown, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'PUT', body, ...options })
  const del = <T>(url: string, options: NitroFetchOptions<'json'> = {}) => $fetch<T>(url, { method: 'DELETE', ...options })

  return { get, post, put, del }
}
