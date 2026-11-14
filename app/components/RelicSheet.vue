<script setup lang="ts">
import type { Relic, RelicScene } from '~/data/relics'
import { buildWordTimings, wordIndexAt } from '~/utils/narration'
import { LOCATION_LABEL, relicLocation, relicStatus } from '~/utils/relics'

const props = defineProps<{ relic: Relic; index: number; armed?: boolean }>()
const emit = defineEmits<{ 'update:index': [index: number]; 'open-media': [scene: RelicScene]; typing: [active: boolean] }>()

const { mode: narrationMode, captions: narrationCaptions, currentTime, duration, speechWord, steps: narrationSteps, stepIndex } = useNarration()

const scroller = ref<HTMLElement | null>(null)

const typed = ref('')
const typing = ref(false)
let typeTimer = 0

const clearTyping = () => {
  window.clearTimeout(typeTimer)
  typeTimer = 0
}

/** O diário escreve-se à frente do leitor (ritmo com pausas na pontuação). */
const typeScene = (delay = 220) => {
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
  typeTimer = window.setTimeout(tick, delay)
}

const scenes = computed(() => props.relic.scenes ?? [])
const emptyScene: RelicScene = { kind: 'image', src: '', kicker: '', body: '' }
const current = computed<RelicScene>(() => scenes.value[props.index] ?? scenes.value[0] ?? emptyScene)

const narrationActive = computed(() => narrationMode.value === 'audio' || narrationMode.value === 'speech')
const captionText = computed(() => narrationSteps.value[stepIndex.value]?.caption || current.value.body)
const captionTimings = computed(() => buildWordTimings(captionText.value, duration.value))
const activeWord = computed(() => {
  if (narrationMode.value === 'speech') return speechWord.value
  if (narrationMode.value !== 'audio') return -1
  return wordIndexAt(captionTimings.value, currentTime.value)
})
const showCaption = computed(() => narrationCaptions.value && narrationActive.value)

const resetTyping = () => {
  clearTyping()
  typed.value = ''
  typing.value = false
  emit('typing', false)
}

// o texto só começa quando o glitch termina (o pai "arma" o diário)
watch(() => props.armed, (armed) => {
  if (armed) typeScene()
  else resetTyping()
})

watch(() => props.index, () => {
  if (props.armed) typeScene()
}, { immediate: true })

// Com narração, quem manda no texto é a legenda palavra-a-palavra.
watch(narrationActive, (active) => {
  if (active) {
    clearTyping()
    typed.value = ''
    typing.value = false
    emit('typing', false)
  }
  else if (props.armed) {
    typeScene()
  }
}, { immediate: true })

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

onBeforeUnmount(() => {
  clearTyping()
})

defineExpose({ goTo })
</script>

<template>
  <div class="rsheet">
    <aside class="rsheet__info">
      <p class="rsheet__eyebrow" data-sheet-item>
        {{ relic.mission }} · {{ LOCATION_LABEL[relicLocation(relic)] }}
      </p>
      <h2 class="sheet__title" data-sheet-item>{{ relic.name }}</h2>
      <p class="rsheet__state" data-sheet-item><StatusBadge :status="relicStatus(relic)" /></p>

      <div class="rsheet__copy" data-sheet-item>
        <Transition name="swap" mode="out-in">
          <div :key="index">
            <p class="rsheet__kicker">{{ current.kicker }}</p>
            <p v-if="showCaption" class="rsheet__body rsheet__body--narr" :aria-label="captionText">
              <NarrationCaption :text="captionText" :active="activeWord" />
            </p>
            <p v-else-if="narrationActive" class="rsheet__body" :aria-label="captionText">
              {{ captionText }}
            </p>
            <p v-else class="rsheet__body" :aria-label="current.body">
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
.rsheet__state { margin: 0; }

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

