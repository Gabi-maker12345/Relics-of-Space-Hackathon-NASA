/**
 * GlEngine — orquestra os planos GL.
 * Valores extraídos do bundle original (ver CLONE.md, Partes 3–5):
 * - entrada: cards .1s/1.25s expo stagger .05 (from .5), stack rise .5 stagger .1,
 *   title .25s/1.25s expo stagger .075, text .35s/1.1s stagger .075, pills .5s/.85s expo
 * - hover do card: dente (u_dent=.1 da altura), .5s expo (in/out)
 * - hover de pill: escala .7s expo in / .5s out
 * - hole/portal: p .85s abre / .65s fecha (easing "folio" de 3 curvas), escala .3/.25
 * - labels de links: alpha * .6 em .3s power2.out
 */
import * as THREE from 'three'
import { setSmoothScrollEnabled } from '../useSmoothScroll'
import { glslCardVertex, glslCardFragment, glslGridVertex, glslGridFragment, glslHoleVertex, glslHoleFragment } from './shaders'
import { buildLines, drawTextPlane, collectDigitTargets, type FontSpec, type DigitEntry, type TextLine } from './textCanvas'
import { CHOREO } from './choreo'

export type GlKind = 'text' | 'card' | 'bar' | 'pill'
export type GlRole = 'title' | 'text' | 'label'

const FOLLOW_LERP = 0.1 // damp do original (a.a = lerp(a.a, a.t, .1*ratio))
const MAX_DPR = 2
const WHEEL_DIVISOR = 0.3
const DIGIT_ROLL_DUR = 0.9
const CAROUSEL_EASE_DUR = 0.85
const HOLE_RADIUS_FACTOR = 0.225 // raio medido no portal do original (576 css de diâmetro @1280)
const BALL_SIZE = 6

/**
 * Câmera e sheet do original (bundle): PerspectiveCamera fov 53.4 em z=camZ,
 * H = tan(fov/2)*camZ (metade da altura do frustum em z=0). O mundo do clone
 * usa 1 unidade = 1 css px em z=0, então H = h/2 e W = w/2.
 */
const CAMERA_FOV = 53.4
const SHEET_DEPTH = 0.2 // D = W*depth (desktop WF=.2; mobile .18)
const SHEET_DEPTH_SMALL = 0.18
const SHEET_SPAN = 1.15 // T (desktop $F; mobile 1)
const SHEET_SPAN_SMALL = 1
const SHEET_VELOCITY = 1.1 // qF: D cresce com a velocidade
const LEAN_DOOR = -0.12 // door (desktop ZF; mobile 0)
const DENT = 0.1 // u_dent
const TITLE_SCRIM = 0.45 // gradiente escuro no rodapé do card sob o título
const FLOOR_RUN = 6 // Mi.run (em meias-alturas)
const FLOOR_WIDE = 4 // Mi.wide
const FLOOR_CELL = 0.22 // Mi.cell
const FLOOR_GRID = 0.08 // Mi.grid
const FLOOR_LIP = 0.2 // Mi.lip
const FLOOR_DROP = 0.06 // Mi.drop
const FLOOR_ALPHA = 0.9 // Mi.alpha

type EngineUniforms = {
  uMap: { value: THREE.Texture | null }
  uOpacity: { value: number }
  uAlpha: { value: number }
  uRadiusPx: { value: number }
  uRes: { value: THREE.Vector2 }
  uShade: { value: number }
  uShadeS: { value: number }
  uWhite: { value: number }
  uScrim: { value: number }
  uHover: { value: number }
  uDent: { value: number }
  uSheetW: { value: number }
  uSheetD: { value: number }
  uSheetT: { value: number }
  uSheetC: { value: number }
  uSheetP: { value: number }
  uSheetV: { value: number }
  uLeanA: { value: number }
  uLeanW: { value: number }
}

type PlaneTextState = {
  lines: TextLine[]
  fontSpec: FontSpec
  reveal: number[] | null
  digits: Map<number, DigitEntry>
  canvasWidth: number
  canvasHeight: number
}

type Plane = {
  el: HTMLElement
  kind: GlKind
  role: GlRole
  group: HTMLElement | null
  card: HTMLElement | null
  index: number
  lens: number
  textRaw: string
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  uniforms: EngineUniforms
  canvas: HTMLCanvasElement
  context2d: CanvasRenderingContext2D
  canvasTexture: THREE.CanvasTexture
  mappedTexture: THREE.Texture | null
  text: PlaneTextState
  widthPx: number
  lastRectHash: string
  dirty: boolean
  entered: boolean
  enterAlpha: number
  lift: number
  scaleBridge: { x: number; y: number }
  hover: number
}

function planeUniforms(texture: THREE.Texture): EngineUniforms {
  return {
    uMap: { value: texture },
    uOpacity: { value: 0 },
    uAlpha: { value: 1 },
    uRadiusPx: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uShade: { value: 0 },
    uShadeS: { value: 1 },
    uWhite: { value: 0 },
    uScrim: { value: 0 },
    uHover: { value: 0 },
    uDent: { value: DENT },
    uSheetW: { value: 0 },
    uSheetD: { value: 0 },
    uSheetT: { value: 1 },
    uSheetC: { value: 1 },
    uSheetP: { value: 0 },
    uSheetV: { value: 0 },
    uLeanA: { value: 0 },
    uLeanW: { value: 0 },
  }
}

type EngineEase =
  | 'power1out'
  | 'power2out'
  | 'power3out'
  | 'power4out'
  | 'expoOut'
  | 'expoIn'
  | 'power2inout'
  | 'folio'

/** Easing "folio" do original: 3 segmentos de bezier cúbico (tabela `vU`). */
const FOLIO_SEGMENTS: number[][] = [
  [0, 0, 0.094, 0.026, 0.124, 0.127, 0.157, 0.29],
  [0.157, 0.29, 0.197, 0.486, 0.254, 0.8, 0.348, 0.884],
  [0.348, 0.884, 0.42, 0.949, 0.374, 1, 1, 1],
]

function cubic(t: number, a0: number, a1: number, a2: number, a3: number): number {
  const u = 1 - t
  return u * u * u * a0 + 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t * a3
}

function folioEase(n: number): number {
  if (n <= 0) return 0
  if (n >= 1) return 1
  for (const seg of FOLIO_SEGMENTS) {
    const [e, , i, , r, , o] = seg
    if (n > o) continue
    let u = 0
    let c = 1
    for (let h = 0; h < 20; h += 1) {
      const f = (u + c) / 2
      if (cubic(f, e, i, r, o) < n) u = f
      else c = f
    }
    return cubic((u + c) / 2, seg[1], seg[3], seg[5], seg[7])
  }
  return n
}

type EngineTween = {
  obj: Record<string, number>
  key: string
  from: number
  to: number
  startAt: number
  duration: number
  ease: EngineEase
  onUpdate: () => void
  onDone: (() => void) | null
}

function engineEase(kind: EngineEase, t: number): number {
  const inv = (p: number) => 1 - Math.pow(1 - t, p)
  switch (kind) {
    case 'power1out': return inv(1)
    case 'power2out': return inv(2)
    case 'power3out': return inv(3)
    case 'power4out': return inv(4)
    case 'expoOut': return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
    case 'expoIn': return t <= 0 ? 0 : Math.pow(2, 10 * t - 10)
    case 'power2inout': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    case 'folio': return folioEase(t)
  }
  return t
}

function canvasColor(raw: string): string {
  const oklab = raw.match(/oklab\([^)]*\/\s*([0-9.]+)\s*\)$/)
  if (oklab !== null) return `rgba(255, 255, 255, ${oklab[1]})`
  return raw
}

function readFontSpec(el: HTMLElement, dpr: number): FontSpec {
  const styles = getComputedStyle(el)
  const align = styles.textAlign
  const radiusRaw = parseFloat(styles.borderRadius)
  return {
    family: styles.fontFamily,
    weight: styles.fontWeight,
    sizePx: parseFloat(styles.fontSize),
    letterSpacingPx: styles.letterSpacing === 'normal' ? 0 : parseFloat(styles.letterSpacing),
    lineHeightPx: parseFloat(styles.lineHeight),
    alignCss: align === 'center' ? 'center' : 'left',
    color: canvasColor(styles.color),
    radiusPx: Number.isNaN(radiusRaw) ? 0 : radiusRaw,
    textTransform: styles.textTransform,
    dpr,
  }
}

export class GlEngine {
  private renderer: THREE.WebGLRenderer | null = null
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 9000)
  private readonly scene = new THREE.Scene()
  private readonly carrier = new THREE.Group()
  private floorMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  private holeMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  private ballMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null
  private planes: Plane[] = []
  private textures = new Map<string, THREE.Texture>()
  private rafId = 0
  private observer: MutationObserver | null = null
  private disposed = false
  private viewport = { w: 1, h: 1, dpr: 1 }
  private bootPromise: Promise<void> | null = null
  private bootedResolve: (() => void) | null = null
  private bootDone = false
  trackEl: HTMLElement | null = null
  private hasCenteredInitial = false
  private readonly carousel = { p: 0, target: 0, max: 1, axis: 'x' as 'x' | 'y', infinite: false, copySpan: 0, perCopy: 0 }
  private mobileRange = { start: 0, end: 0 }
  private readonly pointer = { down: false, id: -1, x: 0, y: 0 }
  private carouselDriven = false
  private trackJump = 0
  private trackX = 0
  private lastDragPx = 0
  private ball = { x: 0, y: 0, tx: 0, ty: 0, alpha: 0, targetAlpha: 0, seen: false }
  private pointerTarget: HTMLElement | null = null
  private listenersOn = false
  private scanQueued = false
  private stallTimer = 0
  private lastTickAt = 0
  private tweens: EngineTween[] = []
  private marks: { at: number; fn: () => void }[] = []
  private trackObserver: ResizeObserver | null = null
  private readonly shieldOpen = new WeakMap<HTMLElement, boolean>()
  private readonly hole = { p: 0, scale: 0.2 }
  private holeWanted: boolean | null = null
  private reduced = false
  private readonly sheet = { W: 1, H: 1, D: 0, T: 1, C: 1, V: 0, A: 0, camZ: 1000 }
  private sheetClock = 0
  private lastCarouselP = 0
  private lastAdvanceAt = 0
  private floorBase = 0

  readonly booted: Promise<void> = new Promise<void>((resolve) => {
    this.bootedResolve = resolve
  })

  private crispDpr(): number {
    // 1 px de canvas = 1 px de dispositivo: texto nítido (o original usa SDF;
    // o downsample 2x com mipmap deixava os labels cinzentos)
    return Math.min(window.devicePixelRatio || 1, MAX_DPR)
  }

  private startRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))
    this.scene.add(this.carrier)
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.buildFloor()
    this.buildHole()
    this.buildBall()
    if (this.holeWanted === true) {
      this.defer(0, () => this.openHole(true))
    }
  }

  /**
   * Piso — porta fiel do FLOOR do original: um quad em perspectiva cuja
   * borda da frente é posicionada a partir do rect dos cards (syncFloor),
   * com a dobradiça (lean) compartilhada com o strip, dissolve em vFar,
   * grade com fwidth e banda de contato. Sem reflexo (pass extra descartado).
   */
  private buildFloor(): void {
    if (!this.floorMesh) {
      const geometry = new THREE.PlaneGeometry(1, 1)
      geometry.rotateX(-Math.PI / 2)
      const uniforms = {
        uLeanK: { value: 1 },
        uLeanA: { value: 0 },
        uLeanW: { value: 1 },
        uRun: { value: 1 },
        uC0: { value: new THREE.Color('#000000') },
        uC1: { value: new THREE.Color('#000000') },
        uAlpha: { value: 0 },
        uGrid: { value: FLOOR_GRID },
        uGridF: { value: new THREE.Vector2(1, 1) },
      }
      const material = new THREE.ShaderMaterial({
        vertexShader: glslGridVertex,
        fragmentShader: glslGridFragment,
        uniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      this.floorMesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>(geometry, material)
      this.floorMesh.renderOrder = -1
      this.floorMesh.frustumCulled = false
      this.scene.add(this.floorMesh)
    }
  }

  /** Recalcula a câmera e a config do sheet para o viewport atual. */
  private updateSheetConfig(): void {
    const { w, h } = this.viewport
    const small = w < 650
    const H = h / 2
    const W = w / 2
    const camZ = H / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2))
    this.sheet.H = H
    this.sheet.W = W
    this.sheet.camZ = camZ
    this.sheet.T = small ? SHEET_SPAN_SMALL : SHEET_SPAN
    this.sheet.C = small ? 0 : 1
    this.sheet.A = small ? 0 : W * LEAN_DOOR
    this.sheet.D = W * (small ? SHEET_DEPTH_SMALL : SHEET_DEPTH) * (1 + SHEET_VELOCITY * this.sheet.V)
    this.camera.fov = CAMERA_FOV
    this.camera.aspect = w / h
    this.camera.position.z = camZ
    this.camera.updateProjectionMatrix()
  }

  /**
   * Piso posicionado pelo fundo dos cards (como o original): a borda da
   * frente fica `drop` abaixo do strip, o run é 6 meias-alturas e a célula
   * 0.22H (quadrada por construção).
   */
  private syncFloor(): void {
    const mesh = this.floorMesh
    if (!mesh) return
    const on = this.viewport.w >= 650
    mesh.visible = on
    if (!on) return
    const { H, W } = this.sheet
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-carousel] [data-gl="card"]'))
    let bottom = 0
    let found = false
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      if (rect.width < 1) continue
      // borda inferior do card em world y (negativo): a frente do piso é o ponto mais baixo
      const edge = -(rect.top + rect.height - this.viewport.h / 2)
      if (!found || edge < bottom) bottom = edge
      found = true
    }
    if (!found) {
      // sem cartões em cena não há piso (a cena 3D vive no gate)
      mesh.visible = false
      return
    }
    const nearY = bottom - H * FLOOR_DROP
    const run = H * FLOOR_RUN
    const width = W * 2 * FLOOR_WIDE
    const camZ = this.sheet.camZ
    // z da borda da frente (coordenadas do original: cards em z=0, câmera em +camZ)
    const nearZ = Math.min(camZ * (1 - Math.abs(nearY) / H) + H * FLOOR_LIP, camZ * 0.8)
    const depth = nearZ + run
    mesh.scale.set(width, 1, depth)
    mesh.position.set(0, nearY, (nearZ - run) / 2)
    const u = mesh.material.uniforms
    u.uRun.value = run
    u.uLeanA.value = this.sheet.A
    u.uLeanW.value = W
    u.uLeanK.value = 1
    const cell = H * FLOOR_CELL
    u.uGridF.value.set(width / cell, run / cell)
  }

  private holeRadius(): number {
    return this.viewport.w * HOLE_RADIUS_FACTOR
  }

  /** Portal (hole): disco preto com anel fino — aproximação do pós-processo original. */
  private buildHole(): void {
    if (this.holeMesh) return
    const uniforms = {
      uP: { value: 0 },
      uAspect: { value: 1 },
      uTime: { value: 0 },
    }
    const material = new THREE.ShaderMaterial({
      vertexShader: glslHoleVertex,
      fragmentShader: glslHoleFragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    this.holeMesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>(new THREE.PlaneGeometry(1, 1), material)
    this.holeMesh.renderOrder = 2
    this.holeMesh.position.set(0, 0, 0)
    this.holeMesh.visible = false
    this.scene.add(this.holeMesh)
  }

  /** Cursor custom: bolinha suave que segue o ponteiro. */
  private buildBall(): void {
    if (this.ballMesh) return
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const uniforms = planeUniforms(texture)
    uniforms.uRadiusPx.value = BALL_SIZE / 2
    const material = new THREE.ShaderMaterial({
      vertexShader: glslCardVertex,
      fragmentShader: glslCardFragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    this.ballMesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>(new THREE.PlaneGeometry(1, 1), material)
    this.ballMesh.scale.set(BALL_SIZE, BALL_SIZE, 1)
    this.ballMesh.renderOrder = 4
    this.ballMesh.visible = false
    this.scene.add(this.ballMesh)
    window.addEventListener('pointermove', this.onBallMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', this.onBallLeave)
  }

  private onBallMove = (e: PointerEvent): void => {
    if (this.reduced) return
    this.ball.tx = e.clientX
    this.ball.ty = e.clientY
    if (!this.ball.seen) {
      this.ball.seen = true
      this.ball.x = e.clientX
      this.ball.y = e.clientY
    }
    const target = e.target as HTMLElement | null
    this.pointerTarget = target
    const shield = target?.closest<HTMLElement>('[data-gl-shield]') ?? null
    const overShield = shield !== null && this.isShieldOpen(shield)
    const desired = overShield ? 0 : 1
    if (this.ball.targetAlpha !== desired) {
      this.ball.targetAlpha = desired
      const step = desired > 0 ? CHOREO.cursorIn : CHOREO.cursorOut
      this.addTween(this.ball, 'alpha', this.ball.alpha, desired, performance.now(), step.dur * 1000, step.ease)
    }
  }

  private onBallLeave = (e: PointerEvent): void => {
    if (e.relatedTarget) return
    this.ball.seen = false
    this.ball.targetAlpha = 0
    this.addTween(this.ball, 'alpha', this.ball.alpha, 0, performance.now(), CHOREO.cursorOut.dur * 1000, CHOREO.cursorOut.ease)
  }

  private updateBall(): void {
    const mesh = this.ballMesh
    if (!mesh) return
    const visible = !this.reduced && this.ball.seen && this.ball.alpha > 0.01
    mesh.visible = visible
    if (!visible) return
    this.ball.x += (this.ball.tx - this.ball.x) * 0.35
    this.ball.y += (this.ball.ty - this.ball.y) * 0.35
    mesh.position.x = this.ball.x - this.viewport.w / 2
    mesh.position.y = -(this.ball.y - this.viewport.h / 2)
    const u = mesh.material.uniforms
    u.uOpacity.value = this.ball.alpha
    u.uRes.value.set(BALL_SIZE, BALL_SIZE)
  }

  /** Abre/fecha o portal (hole). Durações/easing do original. */
  openHole(open: boolean): void {
    this.holeWanted = open
    const mesh = this.holeMesh
    if (!mesh) return
    const now = performance.now()
    const step = open ? CHOREO.holeOpen : CHOREO.holeClose
    const scaleStep = open ? CHOREO.holeScaleIn : CHOREO.holeScaleOut
    this.addTween(this.hole, 'p', this.hole.p, open ? 1 : 0, now, step.dur * 1000, step.ease)
    this.addTween(this.hole, 'scale', this.hole.scale, open ? 1 : 0.2, now, scaleStep.dur * 1000, scaleStep.ease)
    mesh.visible = true
    if (!open) {
      this.defer(700, () => {
        if (this.hole.p < 0.01 && this.holeMesh) this.holeMesh.visible = false
      })
    }
  }

  get holeProgress(): number {
    return this.hole.p
  }

  /** Gate de visibilidade dos painéis (substitui o `inert` do DOM). */
  setShieldOpen(shield: HTMLElement, open: boolean): void {
    this.shieldOpen.set(shield, open)
  }

  private isShieldOpen(shield: HTMLElement): boolean {
    return this.shieldOpen.get(shield) === true
  }

  /** Uma única init por canvas: renderer, observers e o boot completo. */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.bootPromise) return this.bootPromise
    this.startRenderer(canvas)
    this.onResize()
    this.observer = new MutationObserver(() => this.queueScan())
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', this.onResize)
    window.addEventListener('focusin', this.onFocusIn)
    this.startLoop()
    this.bootPromise = (async () => {
      try {
        await Promise.all([
          (document.fonts as FontFaceSet).ready,
          new Promise((resolve) => setTimeout(resolve, 0)),
        ])
      } catch {
        // document.fonts indisponível: seguir
      }
      await this.loadTextures()
      this.scan()
      this.bootedResolve?.()
      this.bootDone = true
    })()
    return this.bootPromise
  }

  private async loadTextures(): Promise<void> {
    let manifest: Record<string, string> = {}
    try {
      const response = await fetch('/textures/manifest.json')
      const parsed: unknown = await response.json()
      manifest = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {}
    } catch {
      manifest = {}
    }
    const loader = new THREE.TextureLoader()
    const jobs: Promise<void>[] = Object.entries(manifest).map(
      ([key, value]) =>
        new Promise<void>((done) => {
          loader.load(
            value,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace
              texture.minFilter = THREE.LinearFilter
              texture.generateMipmaps = false
              this.textures.set(key, texture)
              done()
            },
            undefined,
            () => done(),
          )
        }),
    )
    await Promise.all(jobs)

    // Planos de cartão criados antes das texturas ficam com um Texture vazio;
    // aqui devolvemos-lhes o mapa certo (acontece quando o track ganha cópias).
    for (const plane of this.planes) {
      if (plane.kind !== 'card') continue
      const texture = this.textureForCard(plane.el)
      const material = plane.mesh.material as THREE.ShaderMaterial
      if (material.uniforms.uMap) material.uniforms.uMap.value = texture
      plane.mappedTexture = texture
      plane.dirty = true
    }
  }

  private queueScan(): void {
    if (this.scanQueued || this.disposed) return
    this.scanQueued = true
    requestAnimationFrame(() => {
      this.scanQueued = false
      this.scan()
    })
  }

  /** scan idempotente: vincula novo [data-gl] / [data-title] ao engine; ignora .sr-only. */
  scan(): void {
    if (this.disposed || !this.renderer) return
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-gl="card"],[data-gl="bar"],[data-gl="text"],[data-gl="pill"],[data-title]',
    )
    nodes.forEach((el) => {
      if (this.planes.some((p) => p.el === el)) return
      if (el.closest('.sr-only') !== null) return
      const glAttribute = el.getAttribute('data-gl') ?? ''
      const kind: GlKind =
        glAttribute === 'card'
          ? 'card'
          : glAttribute === 'bar'
            ? 'bar'
            : glAttribute === 'pill'
              ? 'pill'
              : 'text'
      this.planes.push(this.createPlane(el, kind))
    })
    this.planes = this.planes.filter((p) => p.el.isConnected)
    // texto mudou no DOM (Profile→Close, input do email, status) → redesenha
    for (const plane of this.planes) {
      if (plane.kind !== 'text') continue
      const current = (plane.el.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (current !== plane.textRaw) plane.dirty = true
    }
  }

  private createPlane(el: HTMLElement, kind: GlKind): Plane {
    const canvas = document.createElement('canvas')
    const context2d = canvas.getContext('2d') as CanvasRenderingContext2D
    const canvasTexture = new THREE.CanvasTexture(canvas)
    canvasTexture.colorSpace = THREE.SRGBColorSpace
    canvasTexture.minFilter = THREE.LinearFilter
    canvasTexture.magFilter = THREE.LinearFilter
    canvasTexture.generateMipmaps = false
    // subdivisão: o dente do hover (dome por vértice) precisa de interpolação
    const geometry = new THREE.PlaneGeometry(1, 1, 24, 24)
    const textureSource = kind === 'card' ? this.textureForCard(el) : canvasTexture
    const uniforms = planeUniforms(textureSource)
    const material = new THREE.ShaderMaterial({
      vertexShader: glslCardVertex,
      fragmentShader: glslCardFragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>(geometry, material)
    const group = el.closest<HTMLElement>('[data-gl-shield]')
    mesh.renderOrder = group !== null ? 3 : 0
    this.carrier.add(mesh)
    const role: GlRole = el.hasAttribute('data-title') ? 'title' : el.classList.contains('label') ? 'label' : 'text'
    const plane: Plane = {
      el,
      kind,
      role,
      group,
      card: kind === 'card' ? el : el.closest<HTMLElement>('[data-gl="card"]'),
      index: this.planes.length,
      lens: 0,
      textRaw: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      mesh,
      uniforms,
      canvas,
      context2d,
      canvasTexture,
      mappedTexture: kind === 'card' ? textureSource : null,
      text: {
        lines: [],
        fontSpec: readFontSpec(el, this.crispDpr()),
        reveal: null,
        digits: new Map<number, DigitEntry>(),
        canvasWidth: 1,
        canvasHeight: 1,
      },
      widthPx: Math.max(el.clientWidth, 4),
      lastRectHash: '',
      dirty: true,
      entered: kind === 'bar',
      enterAlpha: kind === 'bar' ? 1 : 0,
      lift: 0,
      scaleBridge: { x: 1, y: 1 },
      hover: 0,
    }
    if (kind === 'bar') {
      plane.uniforms.uOpacity.value = 1
      this.addTween(plane.scaleBridge, 'x', plane.scaleBridge.x, 1, performance.now(), 500, 'power3out')
    }
    if (kind === 'card') {
      this.attachHover(el, plane)
    }
    if (kind === 'pill') {
      this.attachPillHover(el, plane)
    }
    if (kind === 'text' && el.closest('a,button') !== null) {
      this.attachLinkHover(el, plane)
    }
    return plane
  }

  /** hover do card: dente GL + (no futuro) luz — duração .5s expo (in/out). */
  private attachHover(el: HTMLElement, plane: Plane): void {
    if (this.reduced) return
    const enter = (): void => {
      this.addTween(plane.uniforms.uHover as unknown as Record<string, number>, 'value', plane.uniforms.uHover.value, 1, performance.now(), CHOREO.cardHover.dur * 1000, CHOREO.cardHover.ease)
    }
    const leave = (): void => {
      this.addTween(plane.uniforms.uHover as unknown as Record<string, number>, 'value', plane.uniforms.uHover.value, 0, performance.now(), CHOREO.cardHover.outDur * 1000, CHOREO.cardHover.outEase)
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
  }

  /**
   * hover do pill: o original anima um campo de lens (fisheye) + o mark da
   * seta em .7s expo in / .5s out. Aqui: lens redesenha o canvas (seta desliza,
   * anel acende) com uma micro-escala de 1.03.
   */
  private attachPillHover(el: HTMLElement, plane: Plane): void {
    if (this.reduced) return
    const tweenLens = (to: number, step: { dur: number; ease: EngineEase }): void => {
      this.addTween(plane, 'lens', plane.lens, to, performance.now(), step.dur * 1000, step.ease, () => {
        this.redrawStaticPlane(plane)
      })
    }
    const enter = (): void => {
      this.addTween(plane.scaleBridge, 'x', plane.scaleBridge.x, 1.03, performance.now(), CHOREO.pillHover.dur * 1000, CHOREO.pillHover.ease)
      this.addTween(plane.scaleBridge, 'y', plane.scaleBridge.y, 1.03, performance.now(), CHOREO.pillHover.dur * 1000, CHOREO.pillHover.ease)
      tweenLens(1, CHOREO.pillHover)
    }
    const leave = (): void => {
      this.addTween(plane.scaleBridge, 'x', plane.scaleBridge.x, 1, performance.now(), CHOREO.pillHover.outDur * 1000, CHOREO.pillHover.outEase)
      this.addTween(plane.scaleBridge, 'y', plane.scaleBridge.y, 1, performance.now(), CHOREO.pillHover.outDur * 1000, CHOREO.pillHover.outEase)
      tweenLens(0, { dur: CHOREO.pillHover.outDur, ease: CHOREO.pillHover.outEase })
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
  }

  /** hover dos links/pills do portal: alpha × .6 em .3s power2.out (hoverText). */
  private attachLinkHover(el: HTMLElement, plane: Plane): void {
    if (this.reduced) return
    const enter = (): void => {
      this.addTween(plane.uniforms.uAlpha as unknown as Record<string, number>, 'value', plane.uniforms.uAlpha.value, CHOREO.linkHoverDim, performance.now(), CHOREO.linkHover.dur * 1000, CHOREO.linkHover.ease)
    }
    const leave = (): void => {
      this.addTween(plane.uniforms.uAlpha as unknown as Record<string, number>, 'value', plane.uniforms.uAlpha.value, 1, performance.now(), CHOREO.linkHover.dur * 1000, CHOREO.linkHover.ease)
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
  }

  /** Textura por data-id a partir do textures/manifest.json (igual ao original). */
  private textureForCard(el: HTMLElement): THREE.Texture {
    const key = el.getAttribute('data-texture') ?? ''
    return this.textures.get(key) ?? new THREE.Texture()
  }

  private buildTextCanvas(plane: Plane): void {
    const dpr = this.crispDpr()
    plane.text.fontSpec = readFontSpec(plane.el, dpr)
    const box = plane.el.getBoundingClientRect()
    // largura/altura do box de layout — scrollWidth/Height incluem o pseudo
    // elemento de hit area (before:-inset-15) e davam canvas de 2 linhas
    const elementWidth = Math.max(box.width, 4)
    const rawText = (plane.el.textContent ?? '').replace(/\s+/g, ' ').trim()
    plane.textRaw = rawText
    const lineCount = Math.max(
      1,
      Math.round(box.height / Math.max(1, plane.text.fontSpec.lineHeightPx)),
    )
    const nextW = Math.ceil(elementWidth * dpr)
    const nextH = Math.ceil(lineCount * plane.text.fontSpec.lineHeightPx * dpr)
    if (plane.canvas.width !== nextW || plane.canvas.height !== nextH) {
      plane.canvas.width = nextW
      plane.canvas.height = nextH
      // CanvasTexture não redimensiona de forma confiável após o primeiro
      // upload (size imutável em parte dos drivers): recria a textura.
      plane.canvasTexture.dispose()
      const texture = new THREE.CanvasTexture(plane.canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      plane.canvasTexture = texture
      plane.uniforms.uMap.value = texture
    }
    plane.text.canvasWidth = plane.canvas.width / dpr
    plane.text.canvasHeight = plane.canvas.height / dpr
    const lines = buildLines(plane.context2d, plane.text.fontSpec, rawText, elementWidth)
    plane.text.lines = lines
    plane.widthPx = elementWidth
    plane.text.digits = collectDigitTargets(lines)
  }

  /* ————— Track / carrossel ————— */

  /** Liga o track do carrossel (index) — idempotente e com re-medidas seguras. */
  attachTrack(el: HTMLElement): void {
    if (this.trackEl !== el) {
      this.trackObserver?.disconnect()
      this.trackObserver = null
      this.trackEl = el
      this.trackObserver = new ResizeObserver(() => {
        this.measureTrack()
        this.centerInitial()
        this.applyTrack()
      })
      this.trackObserver.observe(el)
    }
    const finalize = (): void => {
      this.measureTrack()
      this.centerInitial()
      this.applyTrack()
    }
    finalize()
    requestAnimationFrame(finalize)
    if (!this.listenersOn) {
      window.addEventListener('wheel', this.onWheel, { passive: false })
      window.addEventListener('pointerdown', this.onPointerDown)
      window.addEventListener('pointermove', this.onPointerMove)
      window.addEventListener('pointerup', this.onPointerUp)
      this.listenersOn = true
    }
  }

  private centerInitial(): void {
    if (this.hasCenteredInitial) return
    const el = this.trackEl
    if (!el) return
    if (this.carousel.max < 10 || el.scrollHeight < 10) return
    this.hasCenteredInitial = true
    if (this.carousel.axis === 'x') {
      if (this.carousel.infinite) this.centerInfinite()
      else this.centerCardIndex(1)
    } else {
      // mobile: measureTrack já posiciona o card índice 1 centrado em p=0
      this.carousel.p = 0
      this.carousel.target = 0
      this.applyTrack()
    }
  }

  private measureTrack(): void {
    const el = this.trackEl
    if (!el) return
    const mobile = window.innerWidth < 650
    this.carousel.axis = mobile ? 'y' : 'x'
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-gl="card"]'))
    const last = cards.length > 0 ? cards[cards.length - 1] : null
    if (last !== null) {
      if (mobile) {
        this.carousel.infinite = false
        const anchor = cards[1] ?? cards[0]
        const vh = window.innerHeight
        const start = vh / 2 - (anchor.offsetTop + anchor.offsetHeight / 2)
        const lastBottom = last.offsetTop + last.offsetHeight
        const end = vh - lastBottom
        this.mobileRange.start = start
        this.mobileRange.end = Math.min(end, start)
        this.carousel.max = Math.max(1, start - this.mobileRange.end)
      } else {
        const copies = Number(el.getAttribute('data-copies') ?? 1) || 1
        if (el.hasAttribute('data-infinite') && copies > 1) {
          const perCopy = Math.floor(cards.length / copies)
          const span = cards[perCopy] ? cards[perCopy].offsetLeft - cards[0].offsetLeft : 0
          if (span > 10) {
            this.carousel.infinite = true
            this.carousel.perCopy = perCopy
            this.carousel.copySpan = span
            this.carousel.max = span
            return
          }
        }
        this.carousel.infinite = false
        this.carousel.max = Math.max(1, last.offsetLeft + last.offsetWidth - window.innerWidth)
      }
      return
    }
    const pad = mobile ? parseFloat(getComputedStyle(el).paddingTop) || 0 : 0
    this.carousel.max = mobile
      ? Math.max(1, el.scrollHeight - window.innerHeight + pad)
      : Math.max(1, el.scrollWidth - window.innerWidth)
  }

  /** Valor de p que centraliza o card no viewport (ambos os eixos). */
  private pForCard(target: HTMLElement): number {
    const el = this.trackEl
    if (!el) return this.carousel.target
    const goal = this.carousel.axis === 'x'
      ? target.offsetLeft + target.offsetWidth / 2 - window.innerWidth / 2
      : target.offsetTop + target.offsetHeight / 2 - window.innerHeight / 2
    return THREE.MathUtils.clamp(goal / this.carousel.max, 0, 1)
  }

  /** Boot centraliza o card índice 1 (Casa Di Solare), em desktop e mobile. */
  private centerCardIndex(index: number): void {
    const el = this.trackEl
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-gl="card"]'))
    const target = cards[index] ?? cards[0]
    if (!target) return
    const value = this.pForCard(target)
    this.carousel.p = value
    this.carousel.target = value
    this.applyTrack()
  }

  /** Foco por teclado: centraliza o card correspondente (comportamento do original). */
  private onFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement | null
    if (!target) return
    let card: HTMLElement | null = target.closest('[data-gl="card"]')
    if (card === null) {
      const href = target.getAttribute('href') ?? ''
      if (!href.startsWith('/projects/')) return
      const id = href.replace('/projects/', '')
      card = document.querySelector<HTMLElement>(`article[data-id="${CSS.escape(id)}"][data-gl="card"]`)
    }
    if (card === null || this.trackEl === null) return
    const value = this.pForCard(card)
    this.driveCarousel(value, CAROUSEL_EASE_DUR, 'expoOut')
  }

  private onResize = (): void => {
    if (!this.renderer) return
    this.viewport = {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
    }
    this.updateSheetConfig()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))
    this.renderer.setSize(this.viewport.w, this.viewport.h, false)
    this.buildFloor()
    if (this.holeMesh) {
      const d = this.holeRadius() * 2
      this.holeMesh.scale.set(d, d, 1)
      this.holeMesh.material.uniforms.uAspect.value = this.viewport.w / this.viewport.h
    }
    this.measureTrack()
    for (const plane of this.planes) {
      plane.dirty = true
      if (plane.kind === 'text') this.buildTextCanvas(plane)
    }
  }

  private onWheel = (e: WheelEvent): void => {
    // A página clonada faz scroll nativo; o carrossel só captura a roda quando
    // a cena do portfólio está alinhada com o viewport (data-scene = portfolio).
    if (document.documentElement.dataset.scene !== 'portfolio') return
    if (this.pointer.down) return
    const target = e.target
    if (target instanceof Element && target.closest('[data-modal]')) return
    const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    const delta = e.deltaMode === 1 ? raw * 16 : raw
    // No início da faixa, devolver a roda à página (a cena liberta o Lenis).
    if (!this.carousel.infinite && delta < 0 && this.carousel.target <= 0.0005) {
      document.documentElement.dataset.scene = ''
      requestAnimationFrame(() => {
        setSmoothScrollEnabled(true)
        window.scrollBy(0, delta)
      })
      return
    }
    e.preventDefault()
    this.nudge(delta)
  }

  private nudge(deltaPx: number): void {
    // Original: `a.t += delta`, depois clamp suave de 1 viewport
    // (`a.t = a.a + tanh((a.t - a.a)/ww) * ww`); sem snap — a faixa para onde
    // o damp chegar (confirmado: repousa entre cards).
    const ww = this.viewport.w
    const next = this.carousel.target + deltaPx / this.carousel.max
    // clamp suave a 1 viewport de distância do ponto atual (tanh)
    const away = (next - this.carousel.p) * this.carousel.max
    const limited = this.carousel.p + (Math.tanh(away / ww) * ww) / this.carousel.max
    this.carousel.target = this.carousel.infinite
      ? limited
      : THREE.MathUtils.clamp(limited, 0, 1)
    this.stopCarouselTween()
  }

  /** Move o carrossel com tween próprio (não depende do RAF/GSAP). */
  private driveCarousel(target: number, dur: number, ease: EngineEase): void {
    this.stopCarouselTween()
    this.carouselDriven = true
    this.carousel.target = target
    this.addTween(
      this.carousel, 'p', this.carousel.p, target,
      performance.now(), dur * 1000, ease,
      () => this.applyTrack(),
      () => {
        this.carousel.p = target
        this.carousel.target = target
        this.carouselDriven = false
        this.applyTrack()
      },
    )
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target === null || !target.closest('[data-gl="card"]')) return
    this.pointer.down = true
    this.pointer.id = e.pointerId
    this.pointer.x = e.clientX
    this.pointer.y = e.clientY
    this.lastDragPx = 0
    this.carousel.target = this.carousel.p
  }

  private stopCarouselTween(): void {
    this.tweens = this.tweens.filter(t => t.obj !== this.carousel)
    this.carouselDriven = false
  }

  /** Distância total arrastada no último gesto (para distinguir clique de drag). */
  dragDistance(): number {
    return this.lastDragPx
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.pointer.down || e.pointerId !== this.pointer.id) return
    const dx = e.clientX - this.pointer.x
    const dy = e.clientY - this.pointer.y
    this.pointer.x = e.clientX
    this.pointer.y = e.clientY
    this.lastDragPx += Math.abs(dx) + Math.abs(dy)
    const delta = this.carousel.axis === 'x' ? -dx : -dy
    const scaled = this.carousel.target + (delta / this.carousel.max) * 1.6
    this.carousel.target = this.carousel.infinite
      ? scaled
      : THREE.MathUtils.clamp(scaled, 0, 1)
    this.carousel.p = this.carousel.target
    this.lastAdvanceAt = 0
  }

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointer.id) return
    this.pointer.down = false
    this.pointer.id = -1
  }

  private startLoop(): void {
    const tick = (): void => {
      if (this.disposed) return
      this.tick()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
    // aba em segundo plano tem RAF throttled: pump de 100ms segura o clock
    this.stallTimer = window.setInterval(() => {
      if (this.disposed) return
      const idle = performance.now() - this.lastTickAt
      if (idle > 300) {
        this.tick()
      }
    }, 100)
  }

  private tick(): void {
    const renderer = this.renderer
    if (!renderer) return
    this.lastTickAt = performance.now()
    this.sheetClock = this.lastTickAt / 1000
    this.updateSheetVelocity()
    this.runTweens(this.lastTickAt)
    this.runMarks(this.lastTickAt)
    this.advanceCarousel()
    for (const plane of this.planes) {
      if (plane.kind === 'text' && plane.dirty) {
        this.buildTextCanvas(plane)
        this.drawTextCanvas(plane)
        plane.dirty = false
      }
      this.syncPlane(plane)
    }
    this.trackJump = 0
    this.syncHole()
    this.syncFloor()
    this.updateBall()
    renderer.render(this.scene, this.camera)
  }

  /**
   * V do sheet = tanh(distância restante em px / 550)² — idêntico ao original
   * (`setVelocity(a.t - a.a)` → `t*|t|`). Usar px/s aqui saturava o twist
   * (SHEET_VTWIST 1.8 rad) e o rear-up em qualquer scroll.
   */
  private updateSheetVelocity(): void {
    if (this.reduced) {
      if (this.sheet.V !== 0) {
        this.sheet.V = 0
        this.sheet.D = this.sheet.W * (this.viewport.w < 650 ? SHEET_DEPTH_SMALL : SHEET_DEPTH)
      }
      return
    }
    const remainingPx = Math.abs(this.carousel.target - this.carousel.p) * this.carousel.max
    const t = Math.tanh(remainingPx / 550)
    const v = Math.min(1, Math.abs(t * t))
    if (Math.abs(v - this.sheet.V) > 0.0008) {
      this.sheet.V = v
      const small = this.viewport.w < 650
      this.sheet.D = this.sheet.W * (small ? SHEET_DEPTH_SMALL : SHEET_DEPTH) * (1 + SHEET_VELOCITY * v)
    }
  }

  private syncHole(): void {
    const mesh = this.holeMesh
    if (!mesh) return
    const u = mesh.material.uniforms
    u.uP.value = this.hole.p
    mesh.visible = this.hole.p > 0.002 || this.hole.scale > 0.25
    const d = this.holeRadius() * 2 * Math.max(0.001, this.hole.scale)
    mesh.scale.set(d, d, 1)
    u.uTime.value = this.reduced ? 0 : this.sheetClock
    const floor = this.floorMesh?.material.uniforms
    if (floor) floor.uAlpha.value = this.floorBase * (1 - 0.6 * this.hole.p)
  }

  private advanceCarousel(): void {
    if (!this.trackEl) return
    if (this.carouselDriven) return
    const delta = this.carousel.target - this.carousel.p
    if (Math.abs(delta) > 0.00015) {
      // damp exponencial independente de framerate (0.1 por frame a 60fps)
      const now = this.lastTickAt
      const dt = this.lastAdvanceAt === 0 ? 1 / 60 : Math.min(0.1, (now - this.lastAdvanceAt) / 1000)
      this.lastAdvanceAt = now
      const p = 1 - Math.pow(1 - FOLLOW_LERP, dt * 60)
      this.carousel.p += delta * p
      this.applyTrack()
    } else {
      this.lastAdvanceAt = this.lastTickAt
    }
  }

  private applyTrack(): void {
    const el = this.trackEl
    if (!el) return
    if (this.carousel.axis === 'y') {
      const { start, end } = this.mobileRange
      const t = start + this.carousel.p * (end - start)
      el.style.translate = `0px ${t}px`
    } else {
      const offset = this.carousel.infinite ? this.carousel.copySpan : 0
      // p pode crescer sem limite; o que se desenha é o módulo (1 cópia)
      const phase = this.carousel.infinite
        ? this.carousel.p - Math.floor(this.carousel.p)
        : this.carousel.p
      const px = -phase * this.carousel.max - offset
      // deslocamento aplicado ao track neste frame (o wrap entra aqui)
      this.trackJump += px - this.trackX
      this.trackX = px
      el.style.translate = `${px}px ${-el.offsetHeight / 2}px`
    }
  }

  /** Re-mede e recentra (usado quando o track passa a ter cópias). */
  resetCarousel(): void {
    this.hasCenteredInitial = false
    this.trackX = 0
    this.trackJump = 0
    this.measureTrack()
    this.centerInitial()
    this.applyTrack()
  }

  /** p normalizado em [0,1); no modo infinito nunca satura nas pontas. */
  private wrapP(value: number): number {
    if (!this.carousel.infinite) return THREE.MathUtils.clamp(value, 0, 1)
    const wrapped = value - Math.floor(value)
    return wrapped === 1 ? 0 : wrapped
  }

  /** Coloca a cópia central em cena, com o cartão do meio centrado. */
  private centerInfinite(): void {
    const el = this.trackEl
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-gl="card"]'))
    const target = cards[this.carousel.perCopy + 1] ?? cards[0]
    if (!target) return
    const mid = window.innerWidth / 2 - (target.offsetLeft + target.offsetWidth / 2)
    const value = this.wrapP((-mid - this.carousel.copySpan) / this.carousel.max)
    this.carousel.p = value
    this.carousel.target = value
    this.applyTrack()
  }

  private inTrackCache = new WeakMap<HTMLElement, boolean>()

  private isInTrack(el: HTMLElement): boolean {
    if (this.inTrackCache.has(el)) return this.inTrackCache.get(el) as boolean
    const value = el.closest('[data-carousel]') !== null
    this.inTrackCache.set(el, value)
    return value
  }

  private syncPlane(plane: Plane): void {
    const rect = plane.el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) {
      plane.mesh.visible = false
      return
    }
    plane.mesh.visible = true
    const hash = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.width.toFixed(1)}|${rect.height.toFixed(1)}`
    if (hash !== plane.lastRectHash && plane.kind !== 'text') {
      if (plane.kind === 'bar' || plane.kind === 'pill') {
        this.redrawStaticPlane(plane)
      }
      plane.lastRectHash = hash
    }
    // Text GL usa o box do canvas (line-height) — o rect do DOM inline é mais estreito
    const anchor = plane.kind === 'text'
      ? { w: plane.text.canvasWidth, h: plane.text.canvasHeight }
      : { w: rect.width, h: rect.height }
    const styles = getComputedStyle(plane.el)
    const hiddenByGroup = plane.group ? !this.isShieldOpen(plane.group) : false
    const elOpacity = parseFloat(styles.opacity) || 1
    const glOwned = plane.el.hasAttribute('data-gl') || plane.el.hasAttribute('data-title')
    const invisClass = plane.el.classList.contains('invisible')
    const domHidden = styles.display === 'none' || (styles.visibility === 'hidden' && !glOwned) || (invisClass && plane.kind === 'text')
    const visibility = domHidden ? 0 : hiddenByGroup ? 0 : 1
    // o portal escurece os cards e o piso; títulos/pills seguem visíveis
    const inStrip = plane.group === null && this.isInTrack(plane.el)
    const portalDim = inStrip && plane.kind === 'card' ? 1 - 0.72 * this.hole.p : 1
    const targetOpacity = elOpacity * visibility * (plane.entered ? 1 : 0) * plane.enterAlpha * portalDim
    const uniforms = plane.uniforms
    uniforms.uOpacity.value += (targetOpacity - uniforms.uOpacity.value) * FOLLOW_LERP
    plane.mesh.scale.set(anchor.w * plane.scaleBridge.x, anchor.h * plane.scaleBridge.y, 1)
    const worldX = rect.left + rect.width / 2 - this.viewport.w / 2
    const worldY = -(rect.top + rect.height / 2 - this.viewport.h / 2) + plane.lift
    // No carrossel infinito o track salta uma cópia inteira de uma vez; o damp
    // não pode interpolar esse salto (parecia um recuo). Acima de meia tela,
    // cola direto na posição — o conteúdo é idêntico, o salto é invisível.
    // Num wrap o track salta uma cópia inteira: os planos sofrem o mesmo salto,
    // preservando o atraso do damping (sem "pop" nem interpolação de 2153px).
    if (this.trackJump !== 0 && this.isInTrack(plane.el)) {
      plane.mesh.position.x += this.trackJump
    }
    const dx = worldX - plane.mesh.position.x
    const dy = worldY - plane.mesh.position.y
    plane.mesh.position.x += dx * FOLLOW_LERP
    plane.mesh.position.y += dy * FOLLOW_LERP
    uniforms.uRes.value.set(anchor.w, anchor.h)
    uniforms.uRadiusPx.value = Math.min(
      plane.text.fontSpec.radiusPx,
      Math.min(anchor.w, anchor.h) / 2,
    )

    // Superfície: cards/títulos/pills do strip compartilham sheet + lean;
    // texto de página (chrome, painéis, modal) fica plano.
    const onStrip = this.isInTrack(plane.el) && this.viewport.w >= 650
    const sheetTarget = onStrip && plane.kind !== 'bar' ? 1 : 0
    uniforms.uSheetP.value += (sheetTarget - uniforms.uSheetP.value) * 0.2
    uniforms.uSheetW.value = this.sheet.W
    uniforms.uSheetD.value = this.sheet.D
    uniforms.uSheetT.value = this.sheet.T
    uniforms.uSheetC.value = this.sheet.C
    uniforms.uSheetV.value = this.sheet.V
    uniforms.uLeanA.value = this.sheet.A
    uniforms.uLeanW.value = this.sheet.W
    uniforms.uShade.value = plane.kind === 'card' && onStrip ? 1 : 0
    uniforms.uScrim.value = plane.kind === 'card' && onStrip ? TITLE_SCRIM : 0
  }

  /** Mistura uma cor CSS em direção ao branco (t>0) ou preto (t<0). */
  private shadeColor(raw: string, t: number): string {
    const m = raw.match(/-?[\d.]+/g)
    if (m === null || m.length < 3) return raw
    const r = Number(m[0])
    const g = Number(m[1])
    const b = Number(m[2])
    const target = t >= 0 ? 255 : 0
    const k = Math.min(1, Math.abs(t))
    const mix = (v: number): number => Math.round(v + (target - v) * k)
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
  }

  /** Bar / pill: canvas com shape sólido (bg + border-radius do CSS computado). */
  private redrawStaticPlane(plane: Plane): void {
    const dpr = this.crispDpr()
    const styles = getComputedStyle(plane.el)
    const w = Math.max(2, Math.ceil(plane.el.clientWidth * dpr))
    const h = Math.max(2, Math.ceil(plane.el.clientHeight * dpr))
    plane.canvas.width = w
    plane.canvas.height = h
    const ctx = plane.context2d
    ctx.clearRect(0, 0, w, h)
    const radius = plane.text.fontSpec.radiusPx * dpr
    const lens = plane.lens
    if (plane.kind === 'bar') {
      ctx.fillStyle = '#ffffff'
    } else {
      const base = styles.backgroundColor
      // lens: a superfície "cede" ao ponteiro — o fill ganha um tom de luz
      const luminance = Number((base.match(/-?[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).reduce((a, v) => a + Number(v), 0)) / 765
      ctx.fillStyle = lens > 0.002 ? this.shadeColor(base, (0.5 - luminance) * 0.35 * lens) : base
    }
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, Math.min(radius, h / 2))
    ctx.fill()
    if (plane.kind === 'pill' && plane.el.hasAttribute('data-ring')) {
      ctx.strokeStyle = styles.color
      ctx.lineWidth = Math.max(1, 1 * dpr)
      ctx.beginPath()
      ctx.roundRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, Math.min(radius, h / 2))
      ctx.stroke()
    }
    if (plane.kind === 'pill' && plane.el.hasAttribute('data-arrow')) {
      // "mark" do original: seta diagonal ↗ (haste curta + ponta preenchida),
      // desliza no hover (lens)
      const d = Math.min(w, h)
      const stroke = Math.max(1, 1.15 * dpr) * (1 + lens * 0.2)
      ctx.fillStyle = styles.color
      ctx.strokeStyle = styles.color
      ctx.lineWidth = stroke
      ctx.lineCap = 'round'
      const cx = w * (0.5 + lens * 0.05)
      const cy = h * (0.5 - lens * 0.03)
      const tail = d * 0.115
      const head = d * 0.105
      const half = d * 0.085
      ctx.beginPath()
      ctx.moveTo(cx - tail, cy + tail)
      ctx.lineTo(cx - head * 0.1, cy + head * 0.1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cx + head, cy - head)
      ctx.lineTo(cx - head * 0.5, cy - head * 0.5)
      ctx.lineTo(cx + head * 0.5, cy + head * 0.5)
      ctx.closePath()
      ctx.fill()
    }
    plane.canvasTexture.needsUpdate = true
  }

  private drawTextCanvas(plane: Plane): void {
    drawTextPlane({
      canvas: plane.canvas,
      context: plane.context2d,
      lines: plane.text.lines,
      fontSpec: plane.text.fontSpec,
      reveal: plane.text.reveal,
      digits: plane.text.digits,
    })
    plane.canvasTexture.needsUpdate = true
  }

  /* ————— Ciclo de boot: barras → conteúdo ————— */

  /** Re-run reveal on opening shields (panels). */
  replayShield(shield: HTMLElement): void {
    for (const plane of this.planes) {
      if (plane.kind === 'text' && plane.group === shield) {
        this.runTextReveal(plane, true)
      }
    }
  }

  /** Saída das barras do loader — tween no clock do engine (resolvido mesmo com RAF throttled). */
  exitBars(): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>()
    const bars = this.planes.filter(p => p.kind === 'bar')
    if (bars.length === 0) {
      resolve()
      return promise
    }
    const now = performance.now()
    let pending = bars.length
    bars.forEach((bar, index) => {
      this.addTween(
        bar.scaleBridge, 'x', bar.scaleBridge.x, 0.001,
        now + index * 80,
        420,
        'power2inout',
        () => undefined,
        () => {
          pending -= 1
          if (pending <= 0) resolve()
        },
      )
    })
    return promise
  }

  /** Entrada em cascata — réplica da coreografia Kp do original. */
  enterAll(): void {
    // o piso entra junto com a faixa (u_alpha é tweened por show/hide no original)
    if (this.reduced) {
      this.floorBase = FLOOR_ALPHA
    } else {
      this.addTween(this as unknown as Record<string, number>, 'floorBase', 0, FLOOR_ALPHA, performance.now(), 900, 'power2out')
    }
    if (this.reduced) {
      for (const plane of this.planes) {
        plane.entered = true
        plane.enterAlpha = 1
        plane.lift = 0
        plane.scaleBridge.x = 1
        plane.scaleBridge.y = 1
        if (plane.kind === 'text') {
          plane.text.reveal = new Array(Math.max(1, plane.text.lines.length)).fill(1)
          this.drawTextCanvas(plane)
        }
      }
      return
    }
    const sequence = [...this.planes].filter(p => p.kind !== 'bar')
    let cardIndex = 0
    let pillIndex = 0
    let titleIndex = 0
    let textIndex = 0
    for (const plane of sequence) {
      if (plane.kind === 'card') {
        const delayMs = (CHOREO.cards.at + cardIndex * (CHOREO.cards.stagger ?? 0)) * 1000
        this.defer(delayMs, () => {
          plane.entered = true
          this.addTween(plane.scaleBridge, 'x', CHOREO.cardsFrom, 1, performance.now(), CHOREO.cards.dur * 1000, CHOREO.cards.ease)
          this.addTween(plane.scaleBridge, 'y', CHOREO.cardsFrom, 1, performance.now(), CHOREO.cards.dur * 1000, CHOREO.cards.ease)
          this.addTween(plane, 'enterAlpha', 0, 1, performance.now(), CHOREO.cards.dur * 1000, CHOREO.cards.ease)
        })
        const stackMs = (CHOREO.stack.at + cardIndex * (CHOREO.stack.stagger ?? 0)) * 1000
        this.defer(stackMs, () => {
          const rise = Math.max(plane.el.clientHeight, 40)
          plane.lift = -rise * CHOREO.stackRise
          this.addTween(plane, 'lift', plane.lift, 0, performance.now(), CHOREO.stack.dur * 1000, CHOREO.stack.ease)
        })
        cardIndex += 1
      } else if (plane.kind === 'pill') {
        this.defer((CHOREO.pills.at + pillIndex * (CHOREO.pills.stagger ?? 0)) * 1000, () => {
          plane.entered = true
          this.addTween(plane.scaleBridge, 'x', 0.6, 1, performance.now(), CHOREO.pills.dur * 1000, CHOREO.pills.ease)
          this.addTween(plane.scaleBridge, 'y', 0.6, 1, performance.now(), CHOREO.pills.dur * 1000, CHOREO.pills.ease)
          this.addTween(plane, 'enterAlpha', 0, 1, performance.now(), CHOREO.pills.dur * 1000, CHOREO.pills.ease)
        })
        pillIndex += 1
      } else if (plane.kind === 'text') {
        if (plane.role === 'title') {
          this.defer((CHOREO.title.at + titleIndex * (CHOREO.title.stagger ?? 0)) * 1000, () => this.runTextReveal(plane, false))
          titleIndex += 1
        } else if (plane.role === 'label') {
          this.defer((CHOREO.text.at + textIndex * (CHOREO.text.stagger ?? 0)) * 1000, () => this.runTextReveal(plane, false))
          textIndex += 1
        } else {
          this.defer((CHOREO.text.at + textIndex * (CHOREO.text.stagger ?? 0)) * 1000, () => this.runTextReveal(plane, false))
          textIndex += 1
        }
      }
    }
  }

  private runTextReveal(plane: Plane, panel: boolean): void {
    this.buildTextCanvas(plane)
    const count = Math.max(1, plane.text.lines.length)
    plane.text.reveal = new Array(count).fill(this.reduced ? 1 : 0)
    plane.entered = true
    plane.enterAlpha = 1
    const step = plane.role === 'title' ? CHOREO.title : CHOREO.text
    const baseDelay = panel ? CHOREO.holeDelay : 0
    const now = performance.now()
    if (!this.reduced) {
      for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
        const proxy = { v: 0 }
        this.addTween(
          proxy, 'v', 0, 1,
          now + baseDelay * 1000 + lineIndex * (step.stagger ?? 0) * 1000,
          step.dur * 1000,
          step.ease,
          () => {
            const target = plane.text.reveal
            if (target !== null) target[lineIndex] = proxy.v
            this.drawTextCanvas(plane)
          },
        )
      }
    }
    for (const entry of plane.text.digits.values()) {
      if (this.reduced) {
        entry.roll = 0
      } else {
        this.addTween(
          entry, 'roll', 1, 0,
          now + (baseDelay + 0.05) * 1000,
          DIGIT_ROLL_DUR * 1000,
          'power3out',
          () => this.drawTextCanvas(plane),
        )
      }
    }
    this.drawTextCanvas(plane)
  }

  /* ————— tween engine-próprio (roda no clock do engine, indiferente a RAF throttled) ————— */

  private addTween(
    obj: Record<string, number>,
    key: string,
    from: number,
    to: number,
    startAt: number,
    duration: number,
    ease: EngineEase,
    onUpdate: () => void = () => undefined,
    onDone: (() => void) | null = null,
  ): void {
    this.tweens.push({ obj, key, from, to, startAt, duration, ease, onUpdate, onDone })
  }

  defer(delayMs: number, fn: () => void): void {
    this.marks.push({ at: performance.now() + delayMs, fn })
  }

  private runTweens(now: number): void {
    if (this.tweens.length === 0) return
    const remaining: EngineTween[] = []
    for (const tween of this.tweens) {
      const raw = (now - tween.startAt) / tween.duration
      const t = raw <= 0 ? 0 : raw >= 1 ? 1 : raw
      tween.obj[tween.key] = tween.from + (tween.to - tween.from) * engineEase(tween.ease, t)
      tween.onUpdate()
      if (t >= 1) {
        if (tween.onDone !== null) tween.onDone()
      } else {
        remaining.push(tween)
      }
    }
    this.tweens = remaining
  }

  private runMarks(now: number): void {
    if (this.marks.length === 0) return
    const due = this.marks.filter(mark => now >= mark.at)
    if (due.length === 0) return
    this.marks = this.marks.filter(mark => now < mark.at)
    due.forEach(mark => mark.fn())
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.rafId)
    window.clearInterval(this.stallTimer)
    this.trackObserver?.disconnect()
    this.trackObserver = null
    this.observer?.disconnect()
    window.removeEventListener('focusin', this.onFocusIn)
    window.removeEventListener('pointermove', this.onBallMove)
    document.documentElement.removeEventListener('pointerleave', this.onBallLeave)
    if (this.listenersOn) {
      window.removeEventListener('wheel', this.onWheel)
      window.removeEventListener('pointerdown', this.onPointerDown)
      window.removeEventListener('pointermove', this.onPointerMove)
      window.removeEventListener('pointerup', this.onPointerUp)
      window.removeEventListener('resize', this.onResize)
      this.listenersOn = false
    }
    for (const plane of this.planes) {
      plane.mesh.geometry.dispose()
      plane.mesh.material.dispose()
      plane.canvasTexture.dispose()
      plane.mappedTexture?.dispose()
    }
    this.planes = []
    this.holeMesh?.geometry.dispose()
    this.holeMesh?.material.dispose()
    this.ballMesh?.geometry.dispose()
    this.ballMesh?.material.dispose()
    this.floorMesh?.geometry.dispose()
    this.floorMesh?.material.dispose()
    this.renderer?.dispose()
    this.renderer = null
  }
}
