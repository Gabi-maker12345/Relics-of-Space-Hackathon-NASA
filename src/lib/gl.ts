import { GlEngine } from '@/gl/engine'

let instance: GlEngine | null = null

/** Singleton do engine GL no client. */
export function getGlEngine(): GlEngine {
  if (instance === null) {
    if (typeof window === 'undefined') throw new Error('getGlEngine fora do client')
    instance = new GlEngine()
  }
  return instance
}
