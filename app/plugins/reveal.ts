/**
 * `v-reveal` — revela o elemento quando entra no viewport (uma vez).
 * A transição vive em CSS (`.reveal` / `.is-inview`) para ficar fora do JS.
 * O plugin é universal porque a diretiva precisa de existir também no SSR
 * (`getSSRProps`); o observer só corre no client.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', {
    getSSRProps() {
      return {}
    },
    mounted(el: HTMLElement, binding) {
      if (!import.meta.client) return
      el.classList.add('reveal')
      const delay = Number(binding.value?.delay ?? 0)
      if (delay > 0) el.style.transitionDelay = `${delay}ms`

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.classList.add('is-inview')
        return
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            el.classList.add('is-inview')
            observer.disconnect()
          }
        },
        { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
      )
      observer.observe(el)
      ;(el as HTMLElement & { __reveal?: IntersectionObserver }).__reveal = observer
    },
    unmounted(el: HTMLElement & { __reveal?: IntersectionObserver }) {
      el.__reveal?.disconnect()
    },
  })
})
