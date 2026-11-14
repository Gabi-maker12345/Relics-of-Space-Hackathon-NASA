<script setup lang="ts">
import type { Relic } from '#shared/types/relic'
import { setSmoothScrollEnabled } from '~/composables/useSmoothScroll'
import { isPublished, relicLocation, relicStatus } from '~/utils/relics'

const { t } = useI18n()
const { isExplored } = usePassport()
const { relics, load } = useRelics()

onMounted(() => { void load() })

const visible = computed<Relic[]>(() => relics.value.filter(isPublished))
const total = computed(() => visible.value.length)

/* Esfera de Fibonacci — a distribuição do Infinite Menu original. */
const TILE_COUNT = 84
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/**
 * Em repouso só um punhado de capas fica visível: retas, encostadas às bordas
 * do ecrã, como no original. A relíquia em foco tem um palco próprio (a
 * figura grande) e o globo só se forma durante o arrasto.
 */
const EDGE_SLOTS = [
  { x: '-44vw', y: '-43vh', size: 'clamp(96px, 13vh, 168px)', opacity: '0.55' },
  { x: '44vw', y: '-42vh', size: 'clamp(84px, 11vh, 140px)', opacity: '0.5' },
  { x: '-45vw', y: '38vh', size: 'clamp(88px, 12vh, 152px)', opacity: '0.5' },
  { x: '45vw', y: '36vh', size: 'clamp(100px, 14vh, 176px)', opacity: '0.55' },
  { x: '-52vw', y: '0vh', size: 'clamp(80px, 10vh, 128px)', opacity: '0.35' },
  { x: '52vw', y: '-2vh', size: 'clamp(80px, 10vh, 128px)', opacity: '0.35' },
  { x: '-12vw', y: '-48vh', size: 'clamp(72px, 9vh, 112px)', opacity: '0.3' },
  { x: '14vw', y: '47vh', size: 'clamp(72px, 9vh, 112px)', opacity: '0.3' },
] as const

type Vec3 = [number, number, number]
type Quat = [number, number, number, number]

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const quatAxisAngle = (axis: Vec3, angle: number): Quat => {
  const s = Math.sin(angle / 2)
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)]
}
const quatMultiply = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const quatNormalize = (q: Quat): Quat => {
  const length = Math.hypot(q[0], q[1], q[2], q[3]) || 1
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length]
}
const rotateQ = (q: Quat, v: Vec3): Vec3 => {
  const t = cross([q[0], q[1], q[2]], v).map(value => value * 2) as Vec3
  const u = cross([q[0], q[1], q[2]], t)
  return [v[0] + q[3] * t[0] + u[0], v[1] + q[3] * t[1] + u[1], v[2] + q[3] * t[2] + u[2]]
}

/** Quaternião → `matrix3d` (colunar, como o CSS espera). */
function quatToMatrix([x, y, z, w]: Quat): string {
  const r00 = 1 - 2 * (y * y + z * z)
  const r01 = 2 * (x * y - z * w)
  const r02 = 2 * (x * z + y * w)
  const r10 = 2 * (x * y + z * w)
  const r11 = 1 - 2 * (x * x + z * z)
  const r12 = 2 * (y * z - x * w)
  const r20 = 2 * (x * z - y * w)
  const r21 = 2 * (y * z + x * w)
  const r22 = 1 - 2 * (x * x + y * y)
  return `matrix3d(${r00},${r10},${r20},0,${r01},${r11},${r21},0,${r02},${r12},${r22},0,0,0,0,1)`
}

const IDENTITY = quatToMatrix([0, 0, 0, 1])

const tiles: Vec3[] = Array.from({ length: TILE_COUNT }, (_, index) => {
  const y = 1 - (2 * (index + 0.5)) / TILE_COUNT
  const ring = Math.sqrt(Math.max(0, 1 - y * y))
  return [Math.cos(GOLDEN * index) * ring, y, Math.sin(GOLDEN * index) * ring]
})

const mode = ref<'flat' | 'globe'>('flat')
const moving = ref(false)
const grabbing = ref(false)
const matrix = ref(IDENTITY)
const activeTile = ref(0)
const active = ref(0)
const infoOpen = ref(false)
const infoClose = ref<HTMLButtonElement | null>(null)
const actionButton = ref<HTMLButtonElement | null>(null)

function openInfo(): void {
  infoOpen.value = true
}

function closeInfo(): void {
  if (!infoOpen.value) return
  infoOpen.value = false
  actionButton.value?.focus()
}

watch(infoOpen, async (open) => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('is-info-open', open)
  setSmoothScrollEnabled(!open)
  if (!open) return
  await nextTick()
  infoClose.value?.focus()
})

const hiddenStyle = {
  transform: 'translate3d(0, 0, 0)',
  width: '',
  height: '',
  marginLeft: '',
  marginTop: '',
  opacity: '0',
  pointerEvents: 'none' as const,
}

const flatStyle = (index: number) => {
  const slot = edgeSlotFor(index)
  if (!slot) return hiddenStyle
  return {
    transform: `translate3d(${slot.x}, ${slot.y}, 0)`,
    width: slot.size,
    height: slot.size,
    marginLeft: `calc(${slot.size} / -2)`,
    marginTop: `calc(${slot.size} / -2)`,
    opacity: slot.opacity,
    pointerEvents: 'auto' as const,
  }
}

const globeStyle = (index: number) => {
  const [x, y, z] = tiles[index]!
  const lon = Math.atan2(x, z) * (180 / Math.PI)
  const lat = Math.asin(clamp(y, -1, 1)) * (180 / Math.PI)
  // Folga entre capas + raio grande: o globo ocupa a cena toda.
  return {
    transform: `rotateY(${lon.toFixed(3)}deg) rotateX(${(-lat).toFixed(3)}deg) translateZ(calc(var(--fr-globe-r) * 1.06))`,
    width: '',
    height: '',
    marginLeft: '',
    marginTop: '',
    opacity: '1',
    pointerEvents: 'auto' as const,
  }
}

const tileStyle = (index: number) => (mode.value === 'globe' ? globeStyle(index) : flatStyle(index))

const itemFor = (index: number) => visible.value[assign.value[index]! % Math.max(1, total.value)] ?? null

/**
 * Distribuição das capas pelas 84 capas da esfera, como no original: cada
 * azulejo evita repetir a relíquia dos seis vizinhos mais próximos, para que
 * um passo do globo mude sempre de relíquia.
 */
const assign = computed<number[]>(() => {
  const count = total.value || 1
  const usage = new Array(count).fill(0) as number[]
  const result = new Array<number>(TILE_COUNT).fill(0)
  tiles.forEach((tile, index) => {
    const near = tiles
      .map((other, otherIndex) => [otherIndex === index ? -2 : dot(tile, other), otherIndex] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .map(([, otherIndex]) => result[otherIndex]!)
    let pick = -1
    for (let step = 0; step < count; step++) {
      const candidate = (index + step) % count
      if (near.includes(candidate)) continue
      if (pick < 0 || usage[candidate]! < usage[pick]!) pick = candidate
    }
    if (pick < 0) pick = index % count
    result[index] = pick
    usage[pick] = (usage[pick] ?? 0) + 1
  })
  return result
})

/** Em repouso: até oito capas distintas encostadas às bordas do ecrã. */
const edgeTileIndices = computed<number[]>(() => {
  const count = Math.max(1, total.value)
  const used = new Set<number>([active.value])
  const chosen: number[] = []
  for (let index = 0; index < tiles.length && chosen.length < EDGE_SLOTS.length; index++) {
    const item = assign.value[index]! % count
    if (used.has(item)) continue
    used.add(item)
    chosen.push(index)
  }
  return chosen
})

const edgeSlotFor = (index: number) => {
  const slot = edgeTileIndices.value.indexOf(index)
  return slot >= 0 ? EDGE_SLOTS[slot]! : null
}

const current = computed<Relic | null>(() => visible.value[active.value] ?? visible.value[0] ?? null)
const counter = (index: number) => `${String(index + 1).padStart(2, '0')} / ${String(total.value).padStart(2, '0')}`

const meta = computed(() => {
  const relic = current.value
  if (!relic) return null
  return {
    location: t(`location.${relicLocation(relic)}` as 'location.moon'),
    status: relicStatus(relic),
    explored: isExplored(relic.id),
    extra: relic.is_extra === true,
  }
})

/* Globo: orientação, arrasto, inércia ------------------------------------ */

let orientation: Quat = [0, 0, 0, 1]
let speed = 0
let axis: Vec3 = [0, 1, 0]
let target = -1
let raf = 0
let lastTime = 0
let snapDeadline = 0
let reduced = false
let flattenTimer: ReturnType<typeof setTimeout> | null = null

const globeEl = ref<HTMLElement | null>(null)

function nearestTile(): number {
  let best = 0
  let bestZ = -2
  for (let index = 0; index < tiles.length; index++) {
    const z = rotateQ(orientation, tiles[index]!)[2]
    if (z > bestZ) {
      bestZ = z
      best = index
    }
  }
  return best
}

/** Vizinho imediato na direção pedida, tal como o original faz no autoplay. */
function neighbor(from: number, direction: [number, number]): number {
  const origin = rotateQ(orientation, tiles[from]!)
  let best = -1
  let bestScore = Infinity
  for (let index = 0; index < tiles.length; index++) {
    if (index === from) continue
    const point = rotateQ(orientation, tiles[index]!)
    if (point[2] < 0) continue
    const dx = point[0] - origin[0]
    const dy = point[1] - origin[1]
    const length = Math.hypot(dx, dy)
    if (length < 0.0001) continue
    const align = (dx * direction[0] + dy * direction[1]) / length
    if (align < 0.55) continue
    const score = length * (2.2 - align)
    if (score < bestScore) {
      bestScore = score
      best = index
    }
  }
  return best
}

function report(): void {
  if (moving.value || total.value === 0) return
  const tile = nearestTile()
  const item = assign.value[tile]! % total.value
  frontTile.value = tile
  activeTile.value = tile
  if (item !== active.value) active.value = item
  scheduleFlatten()
}

const frontTile = ref(0)

function applyMatrix(): void {
  matrix.value = quatToMatrix(orientation)
}

function busy(): boolean {
  const settled = Math.acos(clamp(rotateQ(orientation, tiles[frontTile.value]!)[2], -1, 1))
  return grabbing.value || Math.abs(speed) > 0.0005 || settled > 0.02 || target >= 0
}

function scheduleFlatten(): void {
  if (flattenTimer) return
  flattenTimer = setTimeout(() => {
    flattenTimer = null
    if (moving.value || grabbing.value || mode.value !== 'globe') return
    enterFlat()
  }, reduced ? 0 : 60)
}

function enterFlat(): void {
  mode.value = 'flat'
  snapDeadline = 0
  orientation = [0, 0, 0, 1]
  matrix.value = IDENTITY
}

function enterGlobe(): void {
  if (mode.value === 'globe') return
  if (flattenTimer) {
    clearTimeout(flattenTimer)
    flattenTimer = null
  }
  mode.value = 'globe'
  moving.value = true
  snapDeadline = 0
  wake()
}

function frame(now: number): void {
  raf = 0
  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60
  lastTime = now

  if (!grabbing.value) {
    if (Math.abs(speed) > 0.0005) {
      orientation = quatNormalize(quatMultiply(quatAxisAngle(axis, speed * dt), orientation))
      speed *= Math.exp(-dt * 3)
    }
    else {
      speed = 0
    }

    // O encaixe é assintótico; a partir do instante-limite alinha-se de uma
    // vez, para o ciclo terminar e a cena poder assentar.
    if (!snapDeadline && Math.abs(speed) < 0.06) snapDeadline = now + 420
    if (snapDeadline && now >= snapDeadline) {
      const goal = target >= 0 ? target : nearestTile()
      const currentPoint = rotateQ(orientation, tiles[goal]!)
      const angle = Math.acos(clamp(currentPoint[2], -1, 1))
      const turn = cross(currentPoint, [0, 0, 1])
      if (angle > 1e-6 && Math.hypot(turn[0], turn[1], turn[2]) > 1e-6) {
        orientation = quatNormalize(quatMultiply(quatAxisAngle(normalize(turn), angle), orientation))
      }
      target = -1
      speed = 0
      snapDeadline = 0
      frontTile.value = goal
      moving.value = false
      applyMatrix()
      report()
      lastTime = 0
      return
    }

    const goal = target >= 0 ? target : nearestTile()
    const currentPoint = rotateQ(orientation, tiles[goal]!)
    const angle = Math.acos(clamp(currentPoint[2], -1, 1))
    const pull = clamp(1 - Math.abs(speed) / 1.4, 0, 1)
    if (angle > 0.0002 && pull > 0) {
      const turn = cross(currentPoint, [0, 0, 1])
      const step = angle * (1 - Math.exp(-dt * (target >= 0 ? 6 : 8))) * pull
      if (Math.hypot(turn[0], turn[1], turn[2]) > 1e-6) {
        orientation = quatNormalize(quatMultiply(quatAxisAngle(normalize(turn), step), orientation))
      }
    }
    else if (target >= 0 && speed === 0) {
      target = -1
    }
    frontTile.value = goal
  }

  const settledAngle = Math.acos(clamp(rotateQ(orientation, tiles[frontTile.value]!)[2], -1, 1))
  const nextMoving = grabbing.value || Math.abs(speed) > 0.08 || settledAngle > 0.01
  if (nextMoving !== moving.value) moving.value = nextMoving
  if (!nextMoving) report()

  applyMatrix()

  if (busy()) {
    raf = requestAnimationFrame(frame)
    return
  }
  lastTime = 0
}

function wake(): void {
  if (!raf) raf = requestAnimationFrame(frame)
}

function goToTile(index: number): void {
  target = index
  speed = 0
  snapDeadline = 0
  moving.value = true
  wake()
}

/* Arrasto (trackball), inércia e teclado ---------------------------------- */

let dragging = false
let pointerId = -1
let lastX = 0
let lastY = 0
let lastMove = 0
let dragged = 0
let suppressClick = false

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (total.value < 2) return
  dragging = true
  grabbing.value = true
  pointerId = event.pointerId
  dragged = 0
  suppressClick = false
  lastX = event.clientX
  lastY = event.clientY
  lastMove = performance.now()
  speed = 0
  target = -1
  snapDeadline = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging || event.pointerId !== pointerId) return
  const dx = event.clientX - lastX
  const dy = event.clientY - lastY
  if (dx === 0 && dy === 0) return
  lastX = event.clientX
  lastY = event.clientY
  dragged += Math.hypot(dx, dy)

  // O globo só se forma depois de um gesto real; um clique foca sem o montar.
  if (dragged > 4) enterGlobe()

  if (mode.value !== 'globe') return

  const size = globeEl.value?.clientWidth || 400
  const length = Math.hypot(dx, dy)
  const angle = (length / size) * 2.6
  const nextAxis = normalize([dy, dx, 0])
  orientation = quatNormalize(quatMultiply(quatAxisAngle(nextAxis, angle), orientation))

  const now = performance.now()
  const dt = Math.max(1, now - lastMove) / 1000
  lastMove = now
  speed += (angle / dt - speed) * 0.5
  speed = clamp(speed, -14, 14)
  axis = normalize([
    axis[0] + (nextAxis[0] - axis[0]) * 0.5,
    axis[1] + (nextAxis[1] - axis[1]) * 0.5,
    axis[2],
  ])
  applyMatrix()
  moving.value = true
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging || event.pointerId !== pointerId) return
  dragging = false
  grabbing.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  if (mode.value !== 'globe') return
  if (dragged >= 6) {
    suppressClick = true
    window.setTimeout(() => { suppressClick = false }, 0)
  }
  else {
    speed = 0
  }
  wake()
}

function focusTile(index: number): void {
  const item = assign.value[index]! % Math.max(1, total.value)
  activeTile.value = index
  active.value = item
}

function onTileClick(index: number): void {
  if (suppressClick) return
  if (mode.value === 'flat') {
    focusTile(index)
    return
  }
  goToTile(index)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const direction = event.key === 'ArrowRight' ? 1 : -1

  if (mode.value === 'flat') {
    const next = (active.value + direction + total.value) % Math.max(1, total.value)
    const tile = tiles.findIndex((_, index) => assign.value[index]! % Math.max(1, total.value) === next)
    if (tile >= 0) focusTile(tile)
    return
  }

  const next = neighbor(nearestTile(), [direction, 0])
  if (next >= 0) goToTile(next)
}

/** Trackpad horizontal roda o globo; o scroll vertical da página não muda. */
function onWheel(event: WheelEvent): void {
  if (total.value < 2) return
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  event.preventDefault()
  enterGlobe()
  target = -1
  snapDeadline = 0
  axis = [0, 1, 0]
  speed = clamp(speed - event.deltaX * 0.02, -10, 10)
  moving.value = true
  wake()
}

watch(total, (count) => {
  if (count === 0) return
  if (active.value >= count) {
    active.value = 0
    activeTile.value = tiles.findIndex((_, index) => assign.value[index]! % count === 0)
  }
})

function onVisibility(): void {
  if (document.visibilityState === 'visible') wake()
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && infoOpen.value) {
    event.preventDefault()
    closeInfo()
  }
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  globeEl.value?.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('keydown', onWindowKeydown)

  // Repouso: começa plano, com a primeira relíquia em foco.
  const first = tiles.findIndex((_, index) => assign.value[index]! % Math.max(1, total.value) === 0)
  if (first >= 0) focusTile(first)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (flattenTimer) clearTimeout(flattenTimer)
  globeEl.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <section id="missions" class="fr-rmenu" :aria-label="t('nav.relics')">
    <template v-if="current && meta">
      <img
        :key="current.id"
        class="fr-rmenu__amb"
        :src="current.image"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <div class="fr-rmenu__veil" aria-hidden="true" />

      <div class="fr-rmenu__stage" :class="{ 'is-moving': moving }">
        <div class="fr-rmenu__orbit">
          <div
            ref="globeEl"
            class="fr-rmenu__globe"
            :class="{ 'is-grabbing': grabbing, 'is-flat': mode === 'flat' }"
            :style="{ transform: matrix }"
            tabindex="0"
            role="group"
            :aria-label="t('nav.relics')"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @keydown="onKeydown"
          >
            <div
              v-for="(tile, index) in tiles"
              :key="index"
              class="fr-rmenu__tile"
              :class="{ 'is-active': index === activeTile && !moving, 'is-edge': mode === 'flat' && !!edgeSlotFor(index) }"
              :style="[tileStyle(index), { '--i': index }]"
              aria-hidden="true"
              @click="onTileClick(index)"
            >
              <img
                v-if="itemFor(index)"
                :src="itemFor(index)!.image"
                alt=""
                draggable="false"
                decoding="async"
              />
            </div>
          </div>

          <figure class="fr-rmenu__focus" :class="{ 'is-hidden': mode !== 'flat' }">
            <div class="fr-rmenu__focusFrame">
              <img :src="current.image" alt="" draggable="false" />
              <button
                ref="actionButton"
                type="button"
                class="fr-rmenu__action"
                aria-controls="relic-info"
                :aria-expanded="infoOpen"
                :aria-label="t('panels.info')"
                @click="openInfo"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 17 17 7M9.2 7H17v7.8" />
                </svg>
              </button>
            </div>
          </figure>

          <p class="fr-label fr-rmenu__hint" aria-hidden="true">{{ t('panels.drag') }}</p>
        </div>

        <div id="relic-info" class="fr-rmenu__info" :class="{ 'is-open': infoOpen }">
          <button
            ref="infoClose"
            type="button"
            class="fr-rmenu__infoClose"
            :aria-label="t('common.close')"
            @click="closeInfo"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>

          <div :key="`lead-${current.id}`" class="fr-rmenu__lead" aria-live="polite">
            <p class="fr-label fr-rmenu__counter">
              {{ counter(active) }}
              <span class="fr-rmenu__meta">
                {{ meta.location }}
                <StatusBadge :status="meta.status" />
                <span v-if="meta.explored" class="fr-rmenu__explored">{{ t('passport.stamp') }}</span>
                <span v-if="meta.extra" class="fr-rmenu__extra">{{ t('panels.extra') }}</span>
              </span>
            </p>
            <h3 :id="`relic-${current.id}`" class="fr-serif fr-rmenu__title">{{ current.name }}</h3>
            <p class="fr-label fr-rmenu__mission">{{ current.mission }}</p>
          </div>

          <div :key="`detail-${current.id}`" class="fr-rmenu__detail" aria-live="polite">
            <p class="fr-body fr-rmenu__body">{{ current.body }}</p>
            <dl class="fr-facts fr-rmenu__facts">
              <div v-for="fact in current.facts" :key="fact.label">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="fr-rmenu__empty">
      <p class="fr-label">{{ t('panels.empty') }}</p>
      <p class="fr-rmenu__emptyTitle">{{ t('panels.emptyTitle') }}</p>
    </div>
  </section>
</template>
