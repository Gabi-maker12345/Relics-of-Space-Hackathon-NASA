<script setup lang="ts">
import type { Relic, RelicScene } from '~/data/relics'

const props = defineProps<{ relic: Relic; index: number }>()
const emit = defineEmits<{ 'update:index': [index: number]; 'open-media': [scene: RelicScene]; typing: [active: boolean] }>()

const scroller = ref<HTMLElement | null>(null)
const typed = ref('')
const typing = ref(false)
let typeTimer = 0

const clearTyping = () => {
  window.clearTimeout(typeTimer)
  typeTimer = 0
}

/** O diário escreve-se à frente do leitor (ritmo com pausas na pontuação). */
const typeScene = () => {
  clearTyping()
  const text = current.value.body
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  typed.value = ''
  if (reduced) {
    typed.value = text
    typing.value = false
    emit('typing', false)
    return
  }
  typing.value = true
  emit('typing', true)
  let i = 0
  const tick = () => {
    i += 1
    typed.value = text.slice(0, i)
    if (i >= text.length) {
      typing.value = false
      emit('typing', false)
      typeTimer = 0
      return
    }
    const ch = text[i - 1] ?? ''
    const pause = /[.,;:!?—–]/.test(ch) ? 140 : ch === ' ' ? 24 : 9 + Math.random() * 15
    typeTimer = window.setTimeout(tick, pause)
  }
  typeTimer = window.setTimeout(tick, 380)
}

const scenes = computed(() => props.relic.scenes)
const current = computed(() => scenes.value[props.index] ?? scenes.value[0])

watch(() => props.index, typeScene, { immediate: true })

const onScroll = (): void => {
  const el = scroller.value
  if (!el) return
  const next = Math.round(el.scrollTop / Math.max(1, el.clientHeight))
  const clamped = Math.min(scenes.value.length - 1, Math.max(0, next))
  if (clamped !== props.index) emit('update:index', clamped)
}

// o vídeo só recebe `src` quando a cena fica ativa; aqui garantimos o play
watch(
  () => props.index,
  async () => {
    await nextTick()
    const els = scroller.value?.querySelectorAll<HTMLElement>('.rsheet__scene') ?? []
    els.forEach((scene, i) => {
      const video = scene.querySelector('video')
      if (!video) return
      if (i === props.index) void video.play().catch(() => {})
      else video.pause()
    })
  },
  { immediate: true },
)

const goTo = (index: number): void => {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' })
}

onBeforeUnmount(() => clearTyping())

defineExpose({ goTo })
</script>

<template>
  <div class="rsheet">
    <aside class="rsheet__info">
      <p class="rsheet__eyebrow" data-sheet-item>{{ relic.mission }}</p>
      <h2 class="sheet__title" data-sheet-item>{{ relic.name }}</h2>

      <div class="rsheet__copy" data-sheet-item>
        <Transition name="swap" mode="out-in">
          <div :key="index">
            <p class="rsheet__kicker">{{ current.kicker }}</p>
            <p class="rsheet__body" :aria-label="current.body">
              {{ typed }}<span v-if="typing" class="rsheet__caret" aria-hidden="true" />
            </p>
          </div>
        </Transition>
      </div>

      <dl class="rsheet__facts" data-sheet-item>
        <div v-for="fact in relic.facts" :key="fact.label">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </aside>

    <div class="rsheet__stage">
      <div ref="scroller" class="rsheet__scroll" data-lenis-prevent @scroll.passive="onScroll">
        <section
          v-for="(scene, i) in scenes"
          :key="`${relic.id}-${i}`"
          class="rsheet__scene"
          :class="{ 'is-active': i === index }"
        >
          <button
            type="button"
            class="rsheet__hit"
            :aria-label="`Ver ${scene.kicker} em ecrã inteiro`"
            @click="emit('open-media', scene)"
          >
            <img
              v-if="scene.kind === 'image'"
              class="rsheet__media"
              :src="scene.src"
              :alt="relic.alt"
              decoding="async"
            />
            <video
              v-else
              class="rsheet__media"
              :src="i === index ? scene.src : undefined"
              :poster="scene.poster"
              muted
              loop
              playsinline
              autoplay
              tabindex="-1"
            />
            <span class="rsheet__hint" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="13" height="13">
                <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
              </svg>
            </span>
          </button>
        </section>
      </div>

      <div class="rsheet__rail" aria-hidden="true">
        <button
          v-for="(scene, i) in scenes"
          :key="`dot-${i}`"
          type="button"
          class="rsheet__dot"
          :class="{ 'is-on': i === index }"
          tabindex="-1"
          @click="goTo(i)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(14px);
  filter: blur(5px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  filter: blur(5px);
}
</style>

