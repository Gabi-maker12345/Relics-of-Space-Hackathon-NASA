<script setup lang="ts">
import type { Relic, RelicScene } from '~/data/relics'

const props = defineProps<{ relic: Relic; index: number }>()
const emit = defineEmits<{ 'update:index': [index: number]; 'open-media': [scene: RelicScene] }>()

const scroller = ref<HTMLElement | null>(null)
const scenes = computed(() => props.relic.scenes)

const onScroll = (): void => {
  const el = scroller.value
  if (!el) return
  const next = Math.round(el.scrollTop / Math.max(1, el.clientHeight))
  const clamped = Math.min(scenes.value.length - 1, Math.max(0, next))
  if (clamped !== props.index) emit('update:index', clamped)
}

const goTo = (index: number): void => {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: index * el.clientHeight, behavior: 'smooth' })
}

defineExpose({ goTo })
</script>

<template>
  <div class="rsheet">
    <div ref="scroller" class="rsheet__scroll" data-lenis-prevent @scroll.passive="onScroll">
      <section
        v-for="(scene, i) in scenes"
        :key="`${relic.id}-${i}`"
        class="rsheet__scene"
        :class="{ 'is-active': i === index }"
        :aria-label="`${relic.name} — ${scene.kicker}`"
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
        </button>

        <div class="rsheet__veil" />

        <div class="rsheet__copy">
          <p class="rsheet__kicker">{{ scene.kicker }}</p>
          <h3 class="rsheet__title">{{ relic.name }}</h3>
          <p class="rsheet__mission">{{ relic.mission }}</p>
          <p class="rsheet__body">{{ scene.body }}</p>
          <dl v-if="i === 0" class="rsheet__facts">
            <div v-for="fact in relic.facts" :key="fact.label">
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          </dl>
        </div>
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
</template>
