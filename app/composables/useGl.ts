import { GlEngine } from './gl/engine'

let instance: GlEngine | null = null

/**
 * Singleton do engine GL no client. O `as GlEngine` existe porque a instância
 * só é criada no navegador (SSR-safe); window guard assegura contexto válido.
 */
export function useGlEngine(): GlEngine {
  if (instance === null && typeof window !== 'undefined') {
    instance = new GlEngine()
  }
  const strong = instance as GlEngine | null
  if (strong === null) {
    throw new Error('useGlEngine fora do client sem instância')
  }
  return strong
}
