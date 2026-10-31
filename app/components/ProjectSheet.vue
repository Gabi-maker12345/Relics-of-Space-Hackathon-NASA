<script setup lang="ts">
import type { Media, Project } from '~/data/projects'

const props = defineProps<{ project: Project; index: number }>()
const emit = defineEmits<{ step: [direction: number]; 'open-media': [media: Media] }>()

const media = computed(() => props.project.media)
const current = computed(() => media.value[props.index] ?? media.value[0])

const videoRefs = ref<HTMLVideoElement[]>([])
const setVideoRef = (el: Element | ComponentPublicInstance | null, i: number) => {
  if (el instanceof HTMLVideoElement) videoRefs.value[i] = el
}

watch(
  () => props.index,
  async () => {
    await nextTick()
    videoRefs.value.forEach((video, i) => {
      if (!video) return
      if (i === props.index) void video.play().catch(() => {})
      else video.pause()
    })
  },
  { immediate: true },
)

let accumulated = 0
let lastStep = 0
let lastEvent = 0

/** Roda do rato: acumula até passar o limiar e trava por 820 ms (um passo por gesto). */
const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  const now = performance.now()
  if (now - lastEvent > 180) accumulated = 0
  accumulated += event.deltaY
  lastEvent = now

  if (now - lastStep < 820) return
  if (Math.abs(accumulated) < 36) return

  emit('step', accumulated > 0 ? 1 : -1)
  accumulated = 0
  lastStep = now
}
</script>

<template>
  <div class="psheet" @wheel="onWheel">
    <div class="psheet__info">
      <p class="psheet__eyebrow">Arquivo</p>
      <h2 class="sheet__title">{{ project.title }}</h2>
      <p class="psheet__desc">{{ project.description.replace(/^—\s*/, '') }}</p>
      <ul class="psheet__chips">
        <li>
          <NuxtLink :to="project.slug" class="chip chip--arrow" :aria-label="`Open ${project.title}`">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3.6 10.4 10.2 3.8M4.9 3.8h5.3v5.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </NuxtLink>
        </li>
        <li v-for="badge in project.meta" :key="badge">
          <span class="chip chip--tag">{{ badge }}</span>
        </li>
      </ul>
    </div>

    <section
      class="psheet__stage"
      tabindex="0"
      role="group"
      :aria-label="`Mídia ${index + 1} de ${media.length}: ${current.label}`"
    >
      <div class="psheet__frame" :style="{ aspectRatio: current.ratio }">
        <template v-for="(item, i) in media" :key="item.id">
          <video
            v-if="item.kind === 'video'"
            :ref="el => setVideoRef(el, i)"
            class="psheet__media"
            :class="{ 'is-active': i === index }"
            :src="i === index ? item.src : undefined"
            :poster="item.poster"
            muted
            loop
            playsinline
            preload="none"
            tabindex="-1"
          />
          <img
            v-else
            class="psheet__media"
            :class="{ 'is-active': i === index }"
            :src="item.src"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </template>

        <div class="psheet__grain" aria-hidden="true" />

        <button type="button" class="psheet__expand" aria-label="Ver em ecrã inteiro" @click="emit('open-media', current)">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </button>

        <div class="psheet__caption">
          <span class="psheet__kind">{{ current.kind === 'video' ? 'Vídeo' : 'Imagem' }}</span>
          <span class="psheet__label">{{ current.label }}</span>
          <span class="psheet__count">{{ String(index + 1).padStart(2, '0') }} / {{ String(media.length).padStart(2, '0') }}</span>
        </div>
      </div>

      <div class="psheet__dots" aria-hidden="true">
        <span v-for="(item, i) in media" :key="item.id" :class="{ 'is-on': i === index }" />
      </div>

      <p class="psheet__hint">Scroll para percorrer · clique para expandir</p>
    </section>
  </div>
</template>
