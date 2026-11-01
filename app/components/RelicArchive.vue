<script setup lang="ts">
const section = ref<HTMLElement | null>(null)
const elements = ref<HTMLElement[]>([])
const flipping = ref(false)

const setEl = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el instanceof HTMLElement) elements.value[index] = el
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

let raf = 0
let reduced = false

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const loop = () => {
    raf = requestAnimationFrame(loop)
    const el = section.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const span = rect.height - window.innerHeight
    const p = span > 0 ? clamp01(-rect.top / span) : 0

    elements.value.forEach((node, index) => {
      if (!node) return
      const offset = index * 0.09
      const local = reduced ? 1 : clamp01((p - offset) / 0.45)
      const depth = (1 - local) * -1100
      const scale = 0.55 + local * 0.45
      node.style.transform = `translateZ(${depth.toFixed(1)}px) scale(${scale.toFixed(3)})`
      node.style.opacity = (reduced ? 1 : local).toFixed(3)
      node.style.filter = local < 1 ? `blur(${((1 - local) * 16).toFixed(1)}px)` : 'none'
      if (local > 0.9 && node.dataset.born !== '1') {
        node.dataset.born = '1'
        node.classList.add('is-born')
      }
    })
  }

  requestAnimationFrame(loop)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))

/** Flip 2D → 3D: a cena dobra-se para dentro e a viagem leva ao arquivo. */
const startFlip = () => {
  if (flipping.value) return
  flipping.value = true
  document.documentElement.dataset.archiveFlip = '1'

  const target = document.getElementById('portfolio')
  if (target) scrollToElement(target)

  window.setTimeout(() => {
    flipping.value = false
    delete document.documentElement.dataset.archiveFlip
  }, 1900)
}
</script>

<template>
  <section ref="section" class="fr-archive" aria-labelledby="archive-title">
    <div class="fr-archive__stage">
      <div class="fr-archive__plane">
        <p :ref="el => setEl(el, 0)" class="fr-label fr-archive__eyebrow">Arquivo de missões</p>
        <h2 id="archive-title" :ref="el => setEl(el, 1)" class="fr-serif fr-archive__title">
          O que ficou<br />para trás
        </h2>
        <p :ref="el => setEl(el, 2)" class="fr-archive__body">
          Três relíquias, três histórias. A mesma pergunta: o que acontece com aquilo que deixamos de usar?
        </p>
        <div :ref="el => setEl(el, 3)" class="fr-archive__action">
          <ForgeCta label="Ver o arquivo" @click="startFlip" />
        </div>
      </div>
    </div>
  </section>
</template>
