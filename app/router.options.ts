import type { RouterConfig } from '@nuxt/schema'

/**
 * O hash é usado pelo diário (`/#slug`), não por âncoras. Quando o seletor não
 * existe no DOM, o router não deve tentar rolar nem avisar.
 */
export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      if (typeof document === 'undefined') return { top: 0 }
      try {
        if (document.querySelector(to.hash)) return { el: to.hash }
      } catch {
        return { top: 0 }
      }
      return { top: 0 }
    }
    return { top: 0 }
  },
}
