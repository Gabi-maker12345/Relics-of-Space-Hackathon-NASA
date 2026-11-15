import type { GlEngine } from './gl/engine'

/**
 * O engine GL (e o chunk do Three.js) fica fora do caminho crítico: só é
 * descarregado quando o utilizador interage, abre a cena ou o painel de acesso.
 * A landing é DOM puro e pinta antes de o WebGL existir.
 */
let instance: GlEngine | null = null
let loading: Promise<GlEngine> | null = null
let canvas: HTMLCanvasElement | null = null

/** Registado pelo `GlCanvas`; o canvas onde o renderer vai desenhar. */
export function setGlCanvas(el: HTMLCanvasElement | null): void {
  canvas = el
}

export function glEngineLoaded(): boolean {
  return instance !== null
}

/** Instância já carregada, para verificações síncronas (ex.: distinguir clique de arrasto). */
export function getGlEngine(): GlEngine | null {
  return instance
}



/** Descarrega o chunk do engine uma única vez (idempotente). */
export function loadGlEngine(): Promise<GlEngine> {
  if (instance !== null) return Promise.resolve(instance)
  loading ??= import('./gl/engine').then(({ GlEngine }) => {
    instance ??= new GlEngine()
    return instance
  })
  return loading
}

/**
 * Carrega e inicializa o engine no canvas registado. Chamar várias vezes é
 * seguro: o `init` do engine devolve a mesma promessa.
 */
export async function ensureGlEngine(): Promise<GlEngine> {
  const engine = await loadGlEngine()
  if (canvas !== null) await engine.init(canvas)
  return engine
}
