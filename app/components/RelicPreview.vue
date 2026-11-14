<template>
  <Teleport to="body">
    <Transition name="preview">
      <aside
        v-if="open"
        ref="panelRef"
        class="preview"
        :class="{ 'is-dragging': dragging, 'is-expanded': expanded }"
        :style="{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${stageW + PANEL_PADDING * 2}px` }"
        aria-label="Pré-visualização ao vivo"
      >
        <header
          class="preview__head"
          @pointerdown="startDrag"
          @pointermove="onDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <p class="preview__kicker">{{ t('preview.title') }} <em>{{ t('preview.live') }}</em></p>

          <div class="preview__modes" role="group" aria-label="Modo de pré-visualização">
            <button type="button" :class="{ 'is-on': mode === 'panel' }" :aria-pressed="mode === 'panel'" @click="mode = 'panel'">
              {{ t('preview.panel') }}
            </button>
            <button type="button" :class="{ 'is-on': mode === 'modal' }" :aria-pressed="mode === 'modal'" @click="mode = 'modal'">
              {{ t('preview.modal') }}
            </button>
          </div>

          <button
            type="button"
            class="preview__expand"
            :aria-pressed="expanded"
            :aria-label="expanded ? t('preview.collapse') : t('preview.expand')"
            :title="expanded ? t('preview.collapse') : t('preview.expand')"
            @click="toggleExpanded"
          >
            <svg v-if="!expanded" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 2H2v4M10 2h4v4M14 10v4h-4M2 10v4h4" />
            </svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 6h4V2M14 6h-4V2M10 14v-4h4M6 14v-4H2" />
            </svg>
          </button>

          <button type="button" class="preview__close" :aria-label="t('preview.close')" @click="emit('close')">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
          </button>
        </header>

        <div
          class="preview__stage"
          :class="`is-${mode}`"
          :style="mode === 'modal' ? { width: `${stageW}px`, height: `${stageH}px` } : { width: `${stageW}px` }"
        >
          <div v-if="mode === 'modal'" class="preview__scale" :style="{ transform: `scale(${scale})` }">
            <SheetFrame overlay :label="relic.name" :progress="progress" @close="emit('close')">
              <RelicSheet
                :relic="relic"
                :index="index"
                armed
                @update:index="index = $event"
                @open-media="() => undefined"
                @typing="() => undefined"
              />
            </SheetFrame>
          </div>

          <article v-else class="preview__card">
            <div class="preview__cover">
              <RelicCover v-if="cover" :src="cover" :poster="relic.image" :alt="relic.alt || relic.name" />
              <span v-else class="preview__empty">{{ t('preview.noCover') }}</span>
            </div>
            <div class="preview__cardBody">
              <p class="preview__meta">
                <StatusBadge :status="relicStatus(relic)" />
                <span>{{ t(`location.${relicLocation(relic)}` as 'location.moon') }}</span>
              </p>
              <h3 class="preview__name">{{ relic.name || t('preview.unnamed') }}</h3>
              <p class="preview__tagline">{{ relic.tagline || t('preview.noTagline') }}</p>
              <p class="preview__facts">{{ factsLabel }} · {{ scenesLabel }}</p>
            </div>
          </article>
        </div>

        <p v-if="relic.scenes.length === 0" class="preview__noMedia">
          {{ t('preview.noMedia') }}
        </p>

        <footer class="preview__foot">
          <span>{{ progressLabel }}</span>
          <span class="preview__note">{{ t('preview.dragHint') }}</span>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Relic } from '#shared/types/relic'
import { relicLocation, relicStatus } from '~/utils/relics'
const { t } = useI18n()

const props = defineProps<{ open: boolean, relic: Relic }>()
const emit = defineEmits<{ close: [] }>()

const mode = ref<'panel' | 'modal'>('modal')
const index = ref(0)
const expanded = ref(false)
const scale = ref(0.42)
const dragging = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const pos = reactive({ x: 24, y: 24 })

const PANEL_PADDING = 14
const STAGE_W = 1240
const STAGE_H = 747
const MARGIN = 12

const stageW = computed(() => Math.round(STAGE_W * scale.value))
const stageH = computed(() => Math.round(STAGE_H * scale.value))

const progress = computed(() => (props.relic.scenes.length > 0 ? (index.value + 1) / props.relic.scenes.length : 0))
const progressLabel = computed(() => {
  const total = props.relic.scenes.length
  if (mode.value === 'panel') return t('preview.mediaOnCard', { count: total })
  return total > 0 ? t('preview.step', { current: index.value + 1, total }) : t('preview.noMediaShort')
})

const cover = computed(() => props.relic.image || props.relic.scenes[0]?.src || '')
const factsLabel = computed(() => t('preview.facts', { count: props.relic.facts.length }))
const scenesLabel = computed(() => t('preview.scenes', { count: props.relic.scenes.length }))

watch(() => props.relic.scenes.length, (total) => {
  if (index.value > total - 1) index.value = Math.max(0, total - 1)
})

/* ————— janela: posição, limites e tamanho ————— */

function clampPosition(): void {
  const el = panelRef.value
  if (!el) return
  const maxX = Math.max(0, window.innerWidth - el.offsetWidth - MARGIN)
  const maxY = Math.max(0, window.innerHeight - el.offsetHeight - MARGIN)
  pos.x = Math.min(Math.max(Math.min(MARGIN, maxX), pos.x), maxX)
  pos.y = Math.min(Math.max(Math.min(MARGIN, maxY), pos.y), maxY)
}

/**
 * O palco nunca pode exceder o ecrã: o modo compacto é 0.42 no desktop e
 * encolhe em ecrãs pequenos; o expandido ocupa o máximo que couber.
 */
function computeScale(): void {
  const chrome = PANEL_PADDING * 2 // padding lateral do painel
  const availableW = window.innerWidth - MARGIN * 2 - chrome
  const availableH = window.innerHeight - MARGIN * 2 - 130
  const max = expanded.value ? 0.8 : 0.42
  scale.value = Math.max(0.16, Math.min(max, availableW / STAGE_W, availableH / STAGE_H))
}

function placeAtBottomLeft(): void {
  const el = panelRef.value
  if (!el) return
  pos.x = MARGIN
  pos.y = window.innerHeight - el.offsetHeight - MARGIN
  clampPosition()
}

function toggleExpanded(): void {
  expanded.value = !expanded.value
  computeScale()
  void nextTick(clampPosition)
}

watch([mode, expanded], () => {
  void nextTick(clampPosition)
})

let dragStart = { x: 0, y: 0, px: 0, py: 0 }

function startDrag(event: PointerEvent): void {
  const target = event.target as HTMLElement
  if (target.closest('button')) return
  event.preventDefault()
  dragging.value = true
  dragStart = { x: pos.x, y: pos.y, px: event.clientX, py: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onDrag(event: PointerEvent): void {
  if (!dragging.value) return
  pos.x = dragStart.x + (event.clientX - dragStart.px)
  pos.y = dragStart.y + (event.clientY - dragStart.py)
  clampPosition()
}

function endDrag(event: PointerEvent): void {
  if (!dragging.value) return
  dragging.value = false
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

function onResize(): void {
  computeScale()
  clampPosition()
}

// a janela muda de tamanho nas transições (expandir/modo): reencaixa depois
let observer: ResizeObserver | null = null

function attachObserver(): void {
  const el = panelRef.value
  if (!el) return
  observer?.disconnect()
  observer = new ResizeObserver(clampPosition)
  observer.observe(el)
}

// monta quando a janela aparece (o <aside> só existe com `open`)
watch(
  () => props.open,
  (open) => {
    if (!open) {
      observer?.disconnect()
      observer = null
      return
    }
    computeScale()
    void nextTick(() => {
      attachObserver()
      placeAtBottomLeft()
    })
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  observer?.disconnect()
})
</script>

<style scoped>
.preview {
  position: fixed;
  z-index: 140;
  max-width: calc(100vw - 24px);
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  color: var(--fr-paper, #e8e6e1);
  background:
    radial-gradient(80% 60% at 50% -10%, color-mix(in srgb, var(--accent, #7aa2ff) 12%, transparent), transparent 70%),
    #070910;
  border: 1px solid rgb(255 255 255 / 12%);
  box-shadow: 0 30px 80px rgb(0 0 0 / 55%);
  transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}

.preview.is-expanded {
  box-shadow: 0 50px 140px rgb(0 0 0 / 70%);
}

.preview.is-dragging {
  transition: none;
  user-select: none;
}

.preview__head {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: grab;
  touch-action: none;
}

.preview.is-dragging .preview__head { cursor: grabbing; }

.preview__kicker {
  margin: 0;
  font-size: 8.5px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0.55;
  white-space: nowrap;
}

.preview__kicker em {
  font-style: normal;
  text-transform: none;
  letter-spacing: 0.02em;
  opacity: 0.6;
}

.preview__modes {
  display: inline-flex;
  margin-left: auto;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 3px;
  overflow: hidden;
}

.preview__modes button {
  padding: 6px 11px;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: inherit;
  background: none;
  border: 0;
  opacity: 0.5;
  cursor: pointer;
}

.preview__modes button.is-on {
  background: rgb(255 255 255 / 12%);
  opacity: 1;
}

.preview__expand,
.preview__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: inherit;
  background: none;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}

.preview__expand:hover,
.preview__close:hover { background: rgb(255 255 255 / 10%); }

.preview__expand[aria-pressed="true"] {
  background: rgb(255 255 255 / 14%);
  border-color: color-mix(in srgb, var(--accent, #7aa2ff) 60%, transparent);
}

.preview__expand svg,
.preview__close svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linecap: round;
}

.preview__stage {
  position: relative;
  overflow: hidden;
  contain: paint;
  max-width: 100%;
  background: #0a0c14;
  border: 1px solid rgb(255 255 255 / 10%);
  transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1), height 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* o sheet real, a 1:1, reduzido por transform — fidelidade exacta ao público */
.preview__scale {
  width: 1240px;
  height: 747px;
  transform-origin: top left;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/*
 * O sheet público mede-se pelo viewport (118rem / 100dvh), o que aqui
 * transbordava o palco. No preview fica preso ao contentor de 1240×747.
 */
.preview__scale :deep(.sheet) {
  width: calc(100% - 4rem);
  height: calc(100% - 4rem);
  max-height: none;
  margin: 2rem auto;
}

.preview__card {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.preview__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 4%);
}

.preview__cover :deep(.cover) { width: 100%; height: 100%; object-fit: cover; }

.preview__empty {
  font-size: 8.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.35;
}

.preview__cardBody {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: linear-gradient(to top, rgb(3 4 10 / 92%), rgb(3 4 10 / 40%));
}

.preview__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.7;
}

.preview__name {
  margin: 0;
  font-family: var(--fr-serif, inherit);
  font-size: clamp(20px, 2vw, 30px);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.preview__tagline {
  margin: 0;
  font-size: clamp(11px, 1.1vw, 15px);
  line-height: 1.45;
  opacity: 0.72;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview__facts {
  margin: 4px 0 0;
  font-size: 8.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.45;
}

.preview__noMedia {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  opacity: 0.5;
}

.preview__foot {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.45;
}

.preview__note { text-transform: none; letter-spacing: 0.02em; }

.preview-enter-active, .preview-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.preview-enter-from, .preview-leave-to { opacity: 0; transform: translateY(10px); }

@media (max-width: 640px) {
  .preview__kicker { display: none; }
  .preview__note { display: none; }
}
</style>
