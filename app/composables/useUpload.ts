export type UploadKind = 'image' | 'video' | 'audio'

/**
 * Upload direto com progresso real (`xhr.upload.onprogress`). O endpoint aceita
 * até 4 MB; acima disso é preciso o fluxo de signed URL.
 */
export function uploadToStorage(
  file: File,
  kind: UploadKind,
  relicId: string,
  onProgress: (value: number) => void,
): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  form.append('relicId', relicId)

  const xhr = new XMLHttpRequest()
  xhr.open('POST', '/api/admin/upload')
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
  })
  xhr.addEventListener('load', () => {
    let payload: { url?: string, message?: string } = {}
    try {
      payload = JSON.parse(xhr.responseText) as { url?: string, message?: string }
    }
    catch {
      /* resposta sem JSON */
    }
    if (xhr.status >= 200 && xhr.status < 300 && payload.url) resolve(payload.url)
    else reject(new Error(payload.message || `Falha no upload (${xhr.status}).`))
  })
  xhr.addEventListener('error', () => reject(new Error('Falha de rede no upload.')))
  xhr.send(form)

  return promise
}
