# CLONE.md — caderno de clones

> **Regra:** um alvo de clone = uma **Parte** deste ficheiro. Não criar
> `CLONE_SPEC*.md` / `CLONE_PLAN*.md` soltos; um alvo novo entra como nova parte,
> pelo modelo da Parte 6.

| Parte | Alvo | Tipo | Estado |
|---|---|---|---|
| 1 | forgeautomotive.co.uk | extração ao vivo (CDP) | atual — base visual do Space Relics |
| 2 | forgeautomotive.co.uk | plano de implementação | executado (desvios em `PROGRESS.md`) |
| 3 | jesperlandberg.com | extração (REA + SSR) | concluído |
| 4 | jesperlandberg.com | plano de implementação | concluído |
| 5 | jesperlandberg.com | auditoria original↔clone | concluída (0 críticas) |
| 6 | — | modelo para um novo alvo | — |

O registo de execução (o que foi feito, quando, com que evidência) vive em
`PROGRESS.md`; aqui ficam a especificação e o plano.

---

# Parte 1 — forgeautomotive.co.uk · extração

Fonte de verdade do clone que hoje serve de base ao Space Relics. Medido ao vivo
(Chrome 156 via CDP, 1600×900 + 390/700/1024/1440). `[NÃO DETERMINADO]` = não
observável passivamente.

Extração feita em 2026-10-31 com Chrome 156.0.8078.47 via CDP (`--remote-debugging-port`), viewport principal **1600×900** (DPR 1), mais 390/700/1024/1440 para breakpoints. Fontes: DOM ao vivo, CSSOM completo (1.568 regras), folhas externas, chunks JS (23 ficheiros, 1,1 MB), `/ActiveFrame.js`, manifests `.af`, `performance.getEntriesByType('resource')` e HTML SSR. Valores marcados como `px` são medidos; valores em `rem` são os declarados no CSS (root = 10px abaixo de 1600px, 11px a partir de 1600px).

`[NÃO DETERMINADO]` = não observável passivamente ou não exposto ao cliente.

---

#### 1. Stack e tecnologias

| Camada | Valor | Evidência |
|---|---|---|
| Framework | **Next.js 16.3.5** (App Router, Turbopack) | `window.next = {version:"16.3.5", appDir:true, turbopack:true, router:{...}}` |
| UI runtime | **React 19.3.0-canary-cbb046ab-20260731** | string de versão no bundle |
| Estilo | **styled-components** em runtime (CSS-in-JS), sem Tailwind | `<style data-styled>` com 799 regras; classes `sc-<hash>-<n>` + `kTCIhD` (base) |
| Scroll suave | **Lenis 1.3.26** | `window.lenisVersion`; CSS `.lenis{height:100dvh;overflow:auto}`; wrapper `div.lenis` é o scroller real |
| Animação | **GSAP** + **ScrollTrigger** + **SplitText** + `@gsap/react` (`useGSAP`) | `registerPlugin(ScrollTrigger, SplitText, useGSAP)` no chunk; inline styles `translate/rotate/scale/transform/opacity/visibility` típicos de GSAP |
| "Vídeo" de fundo | **ActiveFrame** — decoder próprio sobre **WebCodecs `VideoDecoder`** (HEVC `hvc1.1.6.L93.90`) | `/ActiveFrame.js` (11.101 B) + ficheiros `.af` |
| CMS | **Sanity** (project `ed72g2cx`, dataset `production`) | CSP `connect-src https://ed72g2cx.api.sanity.io`; imagens em `cdn.forgeautomotive.media/images/ed72g2cx/production/...` |
| Hosting | **Netlify** | `cache-status: "Netlify Durable"`, `server: Netlify` |
| CDN de media | **Cloudflare** à frente de `cdn.forgeautomotive.media` | `cf-ray`, `cf-cache-status: HIT`; bloqueia clientes headless (403/“Attention Required”) |
| Transições de rota | **View Transitions API** com tipos (`next-build`) | `::view-transition-*`, `html:active-view-transition-type(next-build)`, `view-transition-name: page / site-header / scroll-progress / scroll-progress-fill` |
| Grelha | Web Component `<waffl-grid>` (12 colunas via `display:grid`) | `<waffl-grid>` no DOM; `waffl-grid>:where(*){grid-column:1/-1}`; definição JS `[NÃO DETERMINADO]` |
| CSS moderno | `@property`, `color-mix()`, `text-wrap:balance`, `interpolate-size`, `dvh`, `mask-image`, `backdrop-filter` | CSSOM |
| Analytics | Google Tag Manager / GA4 | CSP `script-src ... googletagmanager.com`, `img-src ... google-analytics.com`; IDs `[NÃO DETERMINADO]` (nenhum request observado no attach) |
| Ícones | SVG inline (redes sociais, logo, hambúrguer) | `<svg>` inline no header |

**Não usado:** Tailwind, Framer Motion, Three.js (o canvas do rodapé é WebGL do próprio site — ver §3.6), Swiper/Embla, Lottie, jQuery.

---

#### 2. Design system

##### 2.1 Tokens (`:root`, 61 custom properties — valores exatos)

| Token | Valor | Uso |
|---|---|---|
| `--global-black` / `--black` | `#000000` | fundo base, overlays |
| `--global-white` / `--white` | `#ffffff` | texto padrão global (`*{color:var(--white)}`) |
| `--brand-bc1` | `#0C0C0C` | fundo do skip-link, base escura |
| `--brand-bc2` | `#161616` | fundo da transição `next-build` |
| `--brand-bc3` | `#410306` | vinho — `::selection`, foco do CTA |
| `--brand-bc4` | `#C5A064` | ouro (acento) |
| `--brand-bc5` | `#F2F1ED` | branco quente do texto/CA increment, `.cta` fill da barra de progresso |
| `--feedback-positive` | `#3adb76` | estados |
| `--feedback-warning` | `#face10` | estados |
| `--feedback-negative` | `#cc4b37` | estados |

| Escala | Valores (rem, root 10px⇒16? ver nota) |
|---|---|
| `--gap-xxs / xs / s / sm / m / l / xl / xxl / huge / uber / massive` | `0.2 / 0.4 / 0.8 / 1.6 / 2.4 / 3.2 / 4 / 6.4 / 8 / 9.6 / 12.8` |
| `--space-s / m / l / xl` | `4.8 / 6 / 10 / 12` |
| `--br-xs / s / m / l / round` | `0.3 / 0.6 / 1.2 / 1.8 / 999` |
| `--time-s / m / l` | `0.15s / 0.3s / 0.6s` |
| `--easing-bezzy` | `cubic-bezier(0.8, 0, 0, 1)` |
| `--easing-bezzy2` | `cubic-bezier(0.430, 0.195, 0.020, 1)` |
| `--easing-bezzy3` | `cubic-bezier(0.5, 0, 0, 1)` |
| `--easing-ease` | `ease-in-out` |
| `--page-enter-ease` | `cubic-bezier(.2,.7,.2,1)` |
| `--page-beat-dur` | `1.2s` (`.6s` com `hover:none`) |
| `--page-leave-dur` / `--page-enter-dur` | herdam `--page-beat-dur` |
| `--header-size` / `-mobile` / `-desktop` | `3.2rem / 8.8rem / 9.6rem` |
| `--grid-margin` | `1.6rem` (fallback em `.site-nav:focus-within`) |
| `--gap-col` | `calc(8.333vw + 1.6rem)` |
| `--space-col` | `calc(8.333vw + 1.8rem)` |
| `--font-heading` | `"editorial","editorial Fallback",Georgia,Times,"Times New Roman",serif` |
| `--font-body` | `"GeistSans","GeistSans Fallback",Arial,Helvetica,"Liberation Sans",sans-serif` |
| `--font-mono` / `--font-script` | `""` (vazios) |
| `--gradient-angle / -offset / -percent / -shine` | `0deg / 0deg / 5% / rgb(255,255,255)` (com `@property` registadas) |

> Nota de escala: `html{font-size:62.5%}` ⇒ **1rem = 10px**; `@media (min-width:1600px){68.75%}` ⇒ **11px**; `@media (min-width:1920px){75%}` ⇒ **12px**. Todos os `rem` do site escalam com isto (efeito “zoom de layout” em ecrãs grandes).

##### 2.2 Tipografia

| Papel | Família | Peso | Tamanho / line-height | Letter-spacing | Outros |
|---|---|---|---|---|---|
| H1 (hero) | editorial | 200 | `6.4rem` → `7.2rem` → `clamp(7.2rem, 10dvh, 9.6rem)`; medido 64px@390, 72px@700, 90px@1600 | `-0.2rem` (−2.2px@1600) | `text-transform:capitalize`, `text-align:center`, `text-wrap:balance`, lh 1.2 |
| H2 (secções) | editorial | 200 | varia por secção: manifesto **88px**/105.6 · Approach **105.6px**/126.72 · intro de serviços **88px**/105.6 (`grid-column:2/8`) · “Ends Here” **154px**/169.4 · Previous Builds / Available Stock / Footer **105.6px**/126.72 | −2.2px (manifesto e intro: −1.1px) | lh 1.2; linhas quebradas por `SplitText` |
| H3 (painéis: Identity/Insight/…/Protection) | editorial | 200 | 58px @≤1024; 96px @1440; 105.6px @1600 | −2.2px | lh 1.2 |
| Corpo | GeistSans | 300 | 16/22.4 @390 · 18/25.2 @700–1440 · 19.8/27.72 @1600 | −0.55px @1600 | cor `rgba(242,241,237,.8)` |
| Micro-label / botão | GeistSans | 600 | `0.9rem` → `1rem` (≥700px) | `0.3rem` (3.3px@1600) | uppercase, lh 2 |
| Contador de fase (`01 / 03`) | GeistSans | 600 (mesmo estilo micro) | `[NÃO DETERMINADO]` (elemento sem nó de texto isolado no DOM; visualmente igual ao micro-label) | ~0.3rem | uppercase |

Ficheiros de fonte (self-hosted, `/_next/static/media/`):

| Ficheiro | Família | Peso | Estado |
|---|---|---|---|
| `Geist_Variable-s.p.0mrjj4bg00-he.woff2` | GeistSans | 100–900 (variável) | `loaded` |
| `light-s.p.1q4b3b-dtiu5n.woff2` | editorial | 300 | `loaded` |
| `ultralight-s.p.0zgba-tqx_tb1.woff2` | editorial | 200 | `loaded` |
| `ultralight_italic-s.p.2aups5f54pqez.woff2` | editorial | 200 italic | `unloaded` |

Fallbacks com métricas ajustadas: `GeistSans Fallback` (Arial, ascent 94.56%, size-adjust 106.28%) e `editorial Fallback` (Arial, ascent 101.14%, descent 34.48%, line-gap 11.49%, size-adjust 87.01%).

##### 2.3 Grelha

- 12 colunas; a 1600px: coluna **98.14px**, gap **35.2px** (2rem), padding **123.2px 17.6px 0** (topo 11.2rem, laterais 1.6rem).
- Posições verificadas: cartão quadrado do painel = **colunas 3–6** (x 284, w 498); coluna de texto = **colunas 8–10** (x 951, w 365); H1 do hero = **colunas 4–10** (≥1024px), `grid-column: 1/5` <700px, `2/6` ≥700px.
- `.waffl-grid` aplica `grid-column: 1/-1` a filhos sem regra explícita.

##### 2.4 Breakpoints (todos `min-width` exceto indicado)

`320 · 420 · 700 · 1024 · 1200 · 1400 · 1600 · 1920` + `(hover:hover) and (pointer:fine)` + `(hover:none)` + `(any-pointer:coarse)` + `(prefers-reduced-motion:reduce)` + `(min-height:800px)` + `(max-height:500px) and (orientation:landscape)`.

Mudanças observadas:

| Propriedade | 390 | 700 | 1024 | 1440 | 1600 |
|---|---|---|---|---|---|
| `html` font-size | 10px | 10px | 10px | 10px | 11px |
| H1 | 64px | 72px | 90px | 90px | 90px |
| H3 painel | 58px | 58px | 58px | 96px | 105.6px |
| Corpo | 16/22.4 | 18/25.2 | 18/25.2 | 18/25.2 | 19.8/27.72 |
| Nav social | `display:none` | none | `flex` | flex | flex |
| Cartão do painel | `display:none` | none | block (395px, x 101) | 448px, x 256 | 498px, x 284 |
| Coluna de texto | x 24, w 342 | x 16, w 668 | x 613, w 309 | x 856, w 328 | x 951, w 365 |
| Padding do botão menu | 24px | 32px | 40px | 40px | 44px |
| Scroll height | 13.922 | 15.316 | 16.718 | 17.498 | 17.862 |

##### 2.5 z-index

| Camada | z |
|---|---|
| `header` (fixed) | 1000 |
| skip-link aberto | 1001 |
| progresso de scroll (fixed) | 997 |
| `#page:after` (fade de saída) | 996 |
| painel de conteúdo (`section.iZWByV`) | 5 |
| media do painel (sticky) | 0, −1, −2 (três camadas) |
| texto do painel | 3 |
| hero | 2 |

---

#### 3. Estrutura e layout

##### 3.1 Árvore de secções (desktop 1600×900; `y` = offset no documento, `h` = altura)

| # | y | h | Classe | Papel | Conteúdo |
|---|---|---|---|---|---|
| 0 | 0 | 900 | `section.lagqCY` (absolute) | **Hero** | H1 “For Those Who Refuse Ordinary” + deck |
| 1 | 0 | 900 | `section.dKbqDu/.dsgMRE` (absolute) | **Manifesto / intro** | H2 “We Don’t Modify Vehicles / We Build Them For You”, 10 imagens (mosaico) |
| 2 | 1170 | 1080 | `section.iXtGfD` + `section.lpnPdW` (66) | **Approach** | H2, parágrafo, CTA, marquee de 14 logótipos |
| 3 | 3160 | 2700 | `section.iZWByV` | **Trio Identity/Insight/Cohesion** | 3 painéis de 900 |
| 4 | 5860 | 1051 | `section.bMdNWZ` | **Intro de serviços** | H2 longo + parágrafo + CTA |
| 5 | 6461 | 5400 | `section.gXDxwn` | **6 serviços** | Bodystyling, Interior, Wheels, Lighting, Exhaust, Protection |
| 6 | 12311 | 2851 | `section.fCVThr` | **“Ends Here”** | H2 + parágrafo + 3 imagens + canvas WebGL |
| 7 | 15162 | 900 | `section.ktTCgb` | **Previous Builds** | H2, parágrafo, CTA “Explore Builds” |
| 8 | 16062 | 900 | `section.hUxulM` | **Available Stock** | H2, parágrafo, CTA “Browse Stock” |
| 9 | — | 900 | `footer` | **Fecho** | “Are you ready to / Refuse Ordinary”, CTA, Back to Top, links legais |

Total do documento a 1600×900: **17.862px**. Nenhuma secção usa `scroll-snap`; o ritmo vem de blocos de `100dvh` com `position: sticky`.

##### 3.2 Mecânica dos painéis (`section.iZWByV`, repetida em `gXDxwn`)

```
section.iZWByV            h 2700, overflow clip, z 5
├─ aside.erByct  (absolute, 2700)
│  └─ div.dijNgN (sticky, 1600×900)
│     ├─ picture.gjUAhy  z 0   ← imagem do passo ativo   (img opacity .4, blur .8rem)
│     ├─ picture.gjUAhy  z −1  ← passo anterior
│     └─ picture.gjUAhy  z −2  ← próximo passo
└─ div.hOajgw
   └─ waffl-grid (12 col)
      ├─ aside.cstPqq  → cols 3–6 (284, w 498), sticky, h 2700
      │  └─ div.bSEqhL (sticky 900) → 3 × picture.cUIBBc (498×498, y 201) ← imagem NÍTIDA
      └─ section.jpDneB → cols 8–10 (951, w 365), h 2700
         ├─ section.bSwzfb (100dvh, min-height 60rem) → Identity
         ├─ section.bSwzfb → Insight
         └─ section.bSwzfb → Cohesion
```

- Fundo full-bleed: `picture{position:absolute; inset:-1.6rem}` ⇒ a 1600×900 mede **1635×935** (overscan para parallax); `img{object-fit:cover; opacity:.4; filter:blur(.8rem)}` (=8.8px a 1600).
- Três cópias sobrepostas permitem crossfade por `z-index` + transform entre passos.
- Cartão nítido: 498×498, sticky, **sem blur**, uma imagem por passo.
- Abaixo de 1024px o cartão (`aside.cstPqq`) desaparece; o texto ocupa a largura útil.

##### 3.3 Header / chrome fixo

| Elemento | Geometria (1600) | Estilo |
|---|---|---|
| `header` | 1600×110, `position:fixed; inset:0 0 auto; z 1000`, `view-transition-name:site-header` | flex, `justify-content:space-between`, sem fundo |
| `nav[aria-label="Social media"]` | 176×106, x 0 | `display:flex`, padding `3.2rem` (gap-l); `<a>` padding `0.8rem`, ícone `--size:1.6rem` |
| Logo `a[aria-label="Forge home"]` | 76×35, x 762, y 44 | `position:absolute; top:4rem; left:50%; translateX(-50%); z 1` |
| `button[aria-label="Navigate"]` | 203×110, x 1398 | padding `4rem` (gap-xl), `gap:.8rem`, label + 3 barras |
| Barra de progresso | `inset:auto 1.6rem 1.6rem`, h **2px**, z 997 | track `color-mix(#fff 10%)`; fill `#F2F1ED` com `scaleX()` por scroll |

##### 3.4 Menu

- Botão: `aria-expanded` `false|true`, `aria-controls="site-menu"`, label alterna **Navigate ⇄ Close menu**; visual: texto + hambúrguer com `span:nth-child(2){scale:.5 1}` no hover.
- Overlay: `nav[aria-label="Menu"]` com **BUILDS / STOCK / CONTACT / LEGAL**, ícones sociais, **POWERED BY → thevehiclewrappingcentre.com**, **MADE BY 12 STUDIO → 12.studio**.
- Transição de labels: `span[data-menu="closed"]{translateY(0) skewY(0)}` ⇄ `span[data-menu="open"]{position:absolute; translateY(-100%) skewY(3deg)}`, `transition: transform 1s var(--easing-bezzy3)`.
- Existe também `nav[aria-label="Site"]` (skip-link “Home/Builds/Stock/Contact/Legal/Sitemap”) que só aparece em `:focus-within`.

##### 3.5 Fundo do hero / approach (ActiveFrame)

- Não há `<video>` no DOM. O fundo é uma **sequência de frames HEVC** servida em contentores `.af` e decodificada por WebCodecs.
- Formato `.af`: `[chunks…][manifest JSON][uint32 LE = offset do manifest]`.
- Manifest observado: `{type:"h265", codec:"hvc1.1.6.L93.90", width:720, height:1280, fps:24, totalFrames:96|120, gop:"10"|"5", description:"<avcC base64>", frames:[{i,t,o,l,ty:"key"|"delta"}]}`.
- Dois ficheiros medidos: `0b86a50f…af` = **674.566 B**, 120 frames, GOP 5; `6405b827…af` = **291.072 B**, 96 frames, GOP 10. Duração do stream ≈ 4–5 s a 24 fps.
- Decoder: `hardwareAcceleration:"prefer-hardware"`, `optimizeForLatency:true`, fallback em cascata de 4 configs; `FLUSH_IDLE_MS=250`; `MAX_DECODER_RECOVERIES=3`; seek por timestamp (`framesByTimestamp`), com `_needsKeyFrame` após flush.

##### 3.6 Rodapé

- `footer` 900 de altura, `padding:186.128px 0 0` (16.92rem × 11px), fundo `#000`.
- Texto: “Are you ready to” (micro-label) / **“Refuse Ordinary”** (serif) / CTA “Start Your Project” / “Back to Top” (botão com `aria-label="Back to Top"`).
- Botão “Cookie settings: choose again” (`aria-label="Cookie settings: choose again"`).
- `canvas` WebGL **2400×1350** (CSS 2400×1350, x −397) dentro de `div.sc-cda082ca-0.QWFMO`, no bloco final — efeito de shader; conteúdo do shader `[NÃO DETERMINADO]`.

---

#### 4. Componentes

| Componente | Classe | Estrutura | Default | Hover | Focus-visible | Disabled | Outros |
|---|---|---|---|---|---|---|---|
| **CTA** (“Start your project”, “Explore Builds”, “Browse Stock”) | `.gjuatN` | `<a><span><span>letra</span>…</span><i/></a>` | padding `1.6rem 3.2rem` (17.6×35.2px @1600); border `1px solid color-mix(#F2F1ED 10%)`; bg `rgba(0,0,0,.1)`; `backdrop-filter:blur(4px)` (≥1024); label 0.9→1rem/600/ls .3rem/uppercase | border 40%; label `opacity:.6`; letras `translateY(4em)` com stagger 0.02s (text-shadow duplicado a −4em) | `outline:1px dashed 60%; offset 2px`; border `bc3 40%` | `opacity:.4; pointer-events:none` | `<i>` = conic-gradient com `@property --gradient-angle`, `gradient-angle 4.5s linear infinite`, `mix-blend-mode:screen`, `animation-play-state:paused` até ativação |
| **Link social** | `.bXQdvq a` | `<a><svg/></a>` | padding `.8rem`; transition `filter,opacity .3s ease-in-out` | irmãos ficam `opacity:.4` (`:has(a:hover) a:not(:hover)`) | herda `:focus-visible` global | — | `nav` escondido <1024px |
| **Logo** | `.glWlYP` | `svg` interno | absolute, `top:2.4rem` → `3.2rem` (≥420) → `4rem` (≥1024) | — | foco global | — | troca wordmark ↔ símbolo entre hero e restantes secções |
| **Botão menu** | `.ghWabE` | `<button><em><span data-menu/></em><i><span/><span/><span/></i>` | padding `2.4rem`→`3.2rem`→`4rem`; `visibility:hidden; opacity:0` até reveal | `em{opacity:.4}`; barra central `scale:.5 1` | foco global | — | labels sobem/descem com skew 3deg, 1s `bezzy3` |
| **Painel de texto** | `.bSwzfb` | contador + H3 + `<p>` + CTA | `height:100dvh; min-height:60rem`; flex center | — | — | — | largura = 3 colunas (365px @1600) |
| **Cartão de fase** | `.cUIBBc > img` | `<picture><img/></picture>` | 498×498, `object-fit:cover`, sem filtro | — | — | — | sticky; um por passo |
| **Media de fundo** | `.gjUAhy` | `<picture><img/></picture>` | `inset:-1.6rem`; img `opacity:.4; filter:blur(.8rem)`; `object-fit:cover` | — | — | — | 3 camadas z 0/−1/−2 |
| **Marquee de marcas** | `.lpnPdW` | `<div><ul><li><img/></li>…</ul><ul/>…</div>` | `--gap:6.4rem; --speed:20s`; máscara horizontal com fade 30%; `li{height:4rem; aspect-ratio:2/1}` → `6rem` ≥1024 | — | — | — | `animation: logoMarquee 20s linear infinite`, `--play-state:paused` por default |
| **Progresso** | `.cRgakU` / `.cKWHgz` | track + fill | 2px, bottom/left/right 1.6rem, z 997 | — | — | — | fill via `transform:scaleX()`; `view-transition-name` para sobreviver a navegação |
| **Skip-link** | `.site-nav` | `<nav><ul><li><a>` | `sr-only` (clip) | — | `:focus-within` → bloco visível em `bottom-left`, bg `bc1`, texto `bc5`, 1.4rem | — | z 1001 |
| **Cookie gate** | overlay inicial | “Bespoke vehicles built on distinction…” + ACCEPT & ENTER / REJECT & ENTER | ecrã inteiro, texto serifado grande | — | — | — | decisão guardada; reabre por “Cookie settings: choose again” |

---

#### 5. Comportamento e interação

| Efeito | Gatilho | Detalhe medido |
|---|---|---|
| Smooth scroll | wheel/touch | Lenis sobre `.lenis` (`height:100dvh; overflow:auto; overscroll-behavior:none; touch-action:pan-y`); `html,body{overflow:hidden}` |
| Reveal de entrada | load | H1 (`visibility:hidden; opacity:0`), nav social e botão menu (idem) passam a `opacity:1; visibility:inherit` via GSAP; `SplitText` para linhas/letras |
| Progresso de scroll | scroll | `scaleX` do fill; 2px; sobrevive a transições (`view-transition-name:scroll-progress*`) |
| Passos dos painéis | scroll (sticky) | 3 passos em 2700px / 6 passos em 5400px; troca de imagem por z-index; texto por passo |
| Scrub de vídeo | scroll | ActiveFrame decodifica frames HEVC alvo por timestamp; flush só quando ocioso 250ms |
| Marquee | in-view | `logoMarquee` 20s linear infinite; `--play-state` controlado por JS |
| CTA hover | hover fino | border 10%→40% (`border-color .5s ease-in-out`), label 0.6, letras sobem 4em (0.5s `bezzy2`, stagger 0.02s) |
| CTA shine | sempre | `gradient-angle` 4.5s linear infinite (pausado até ativação) |
| Menu | click | label swap 1s `bezzy3`; `aria-expanded`; `data-menu` alterna `closed/open` |
| Transição de página | navegação | View Transitions: `page-fade-in` `--page-enter-dur` `--page-enter-ease`; variante `next-build` (1.2s, `cubic-bezier(.7,.05,.13,1)`): página antiga desce `translateY(-50%)` + `brightness(1.6) saturate(.6)` + `opacity .2`, nova sobe de `translateY(100%)` |
| Fade de saída | navegação | `#page:after` (z 996, `--black`) com `opacity` `--page-leave-dur` |
| Cursor personalizado | — | **não existe** (nenhum elemento fixed com `mix-blend-mode`/cursor custom; o quadrado visto em capturas é o cursor do SO sobre a imagem) |
| Reduced motion | media query | `#page:after{display:none}`; `html,body{height:auto;overflow:auto}`; `next-build` troca para fade |

---

#### 6. Assets

| Tipo | Ficheiros / padrão | Dimensões | Função |
|---|---|---|---|
| Fonte | `Geist_Variable…woff2` | variável 100–900 | corpo |
| Fonte | `light…woff2`, `ultralight…woff2`, `ultralight_italic…woff2` | 200/300 | títulos |
| Imagem | `cdn.forgeautomotive.media/images/ed72g2cx/production/<hash>-<W>x<H>.jpg?auto=format&fit=max&w=<n>` | originais 2880×2218, 2880×2234, 2880×3600, 216×270 | 61 `<img>` na home |
| Sequência | `cdn.forgeautomotive.media/files/ed72g2cx/production/<hash>.af` | 720×1280 HEVC | fundo scrub |
| Ícones | `favicon.ico` 48, `icon0.svg`, `icon1.png` 96, `apple-icon.png` 180 | — | favicons |
| Manifest | `/manifest.json` | — | PWA |
| OG | `…-1200x630.jpg?w=1200&h=630` | 1200×630 | partilha |
| Script extra | `/ActiveFrame.js` | 11.101 B | decoder |
| Logótipos | 14 marcas (Aston Martin, Audi, Bentley, Jaguar, Lamborghini, Land Rover, Lotus, Lucid, Maserati, McLaren, Mercedes, Polestar, Porsche, Rolls Royce) | aspect 2/1, `contain` | marquee |

Alt texts observados: “Matte black Lamborghini”, “Forge Lambo Interior”, “Man in black hoodie”, “Two technicians meticulously applying PPF”, “Rear view of a Porsche GT3RS”, “Craftsman applying PPF”, “Land Rover Defender in the workshop”, “McLaren on grass”, “Audio R8 in orange outside the warehouse”, “Range Rover getting a new wrap”, “Hands meticulously stitching red”, “Forge Identity – Spirit of Ecstasy”, “Forge Intent – Custom Carbon Fibre”, “Forge Cohesion – Backend McLaren”, “Close-up”, e “<Marca> Logo”.

---

#### 7. Dados e rede

| Pedido | Tipo | Observação |
|---|---|---|
| `/_next/static/chunks/*.js` (23) + `/_next/static/chunks/*.css` (3) | script/css | build Turbopack |
| `cdn.forgeautomotive.media/images/...` (57) | imagem | Sanity image pipeline |
| `cdn.forgeautomotive.media/files/....af` (2) | fetch | Hevc scrub (bloqueado em headless) |
| `/?_rsc=…`, `/legal/?_rsc=…`, `/contact/?_rsc=…`, `/builds/?_rsc=…`, `/stock/?_rsc=…` | fetch (RSC) | prefetch de rotas do App Router |
| `googletagmanager.com` / `google-analytics.com` | script/img | GA4; IDs `[NÃO DETERMINADO]` |

Conteúdo vem do Sanity **no servidor** — nenhum request a `api.sanity.io` no cliente durante a sessão observada.

Estrutura de conteúdo inferida do DOM: `relic`-like `{ slug, title (H2/H3), intro (p), media[] (imagem + alt), cta{label,href}, counter{index,total} }` por secção/ passo; marcas como lista `{ name, logo }`.

##### 7.1 Conteúdo textual

**Hero (H1):** “For Those Who Refuse Ordinary”
**Deck:** “A luxury automotive atelier for bespoke styling, performance and craftsmanship.”
**Manifesto (H2):** “We Don’t Modify Vehicles / We Build Them For You”
**Approach (H2):** “Our Approach To Every Build” — p: “Every decision is intentional, every detail has purpose based on your taste, your lifestyle, and your standards.” — CTA “START YOUR PROJECT”
**Identity (01/03):** “Every build begins with the person behind the wheel, shaped around their individual taste, lifestyle, presence and personal sense of identity on the road.”
**Insight (02/03):** “Exterior, interior and performance are brought together through a considered, detail-led approach, creating one complete and fully resolved vision.”
**Cohesion (03/03):** “Every modification is chosen with precision, ensuring each detail adds purpose, balance and distinction to the final bespoke automotive build.”
**Intro de serviços (H2):** “A vehicle should say something before it moves. Every line, material, and finish is considered.” — p: “Our services are shaped with intent, from exterior styling and interior refinement to performance upgrades, detailing and bespoke finishes; each detail sharpens the vehicle’s character without overpowering it.”
**Bodystyling:** “From aero styling to carbon details and exterior refinement, bodywork is designed to change the vehicle’s presence without compromising its original character.”
**Interior:** “Material, stitching, trim and finish are selected to create an interior that feels personal, tactile and composed. We turn the cabin into a space of identity, comfort and control.”
**Wheels:** “Bespoke wheel upgrades designed to enhance stance, proportion and road presence, with fitments selected to complement the vehicle’s character and performance.”
**Lighting:** “Lighting gives a vehicle its expression. From subtle tinting to signature illumination and refined visual details, we use light to sharpen character, presence and atmosphere.”
**Exhaust:** “Exhaust upgrades are chosen for tone, response and presence. Not noise for the sake of noise, but a sound profile that gives the vehicle more character and depth.”
**Protection:** “Paint protective film solutions that preserve the finish of the vehicle while allowing for satin finishes, coloured films and full visual transformation.”
**Ends Here:** “Complete expressions of taste, intent and individuality, shaped through detail, restraint and presence.”
**Previous Builds:** “A collection of previous bespoke builds, shaped by craft, character and the people behind the wheel.” — CTA “Explore Builds → /builds/”
**Available Stock:** “Builds available for purchase, refined with intent, engineered with purpose, and ready to make a statement.” — CTA “Browse Stock → /stock/”
**Footer:** “Are you ready to” / “Refuse Ordinary” / “Start Your Project” / “Back to Top”
**Gate:** “Bespoke vehicles built on distinction, desire, and identity. — not simply to be modified.” / “WE USE ANALYTICS COOKIES TO IMPROVE THE SITE. EITHER CHOICE ENTERS — CHANGE IT ANY TIME FROM THE MENU.”

---

#### 8. Acessibilidade e SEO

| Item | Valor |
|---|---|
| `lang` | `en-GB` |
| `<title>` | `Bespoke Vehicle Builds & Styling \| Forge Automotive` |
| `meta description` | `A luxury automotive atelier for bespoke styling, performance and craftsmanship — one-off Defender, G63, Range Rover, Urus and 911 builds.` |
| OG | `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale=en_GB`, `og:image` 1200×630, `og:type=website`; `twitter:card=summary_large_image` |
| Canonical | **ausente** |
| `theme-color` | `#0c0c0c` |
| Hierarquia | H1 (hero) → H2 (secções) → H3 (painéis/serviços). Sem saltos. |
| ARIA | `nav[aria-label="Social media"]`, `nav[aria-label="Menu"]`, `nav[aria-label="Site"]`, `a[aria-label="Forge home"]`, `button[aria-label="Navigate"/"Close menu"/"Cookie settings: choose again"/"Back to Top"]`, `aria-expanded` + `aria-controls="site-menu"`, `aria-label` nos links de CTA (“Go to Contact”, “Start Your Project”, “Contact Us”), H2 com `aria-label` repetindo o texto |
| Foco | `:focus-visible{outline:1px solid; outline-offset:4px}`; CTA com outline tracejado próprio; skip-link visível em `:focus-within` |
| Alt | Todos os `<img>` de conteúdo têm alt descritivo (ver §6); logos têm “<Marca> Logo” |
| Movimento | `prefers-reduced-motion` desativa transições de página e liberta o scroll |
| Contraste | Texto principal `#F2F1ED` sobre `#000` (≈18,6:1). Corpo a 80% de opacidade sobre fotografia: contraste **variável** — `[NÃO DETERMINADO]` por ecrã |
| Idioma do conteúdo | Inglês (en-GB); sem versão PT |
| Sitemap | `/sitemap/` e `/sitemap.xml` `[NÃO DETERMINADO]` |

---

#### 9. Lacunas (`[NÃO DETERMINADO]`)

1. Valores exatos das tweens GSAP (duração/ease por reveal e por SplitText) — não há `window.gsap` exposto; só o registo dos plugins é observável.
2. Configuração do `SplitText` (por linha, palavra ou letra) e o markup resultante.
3. Definição do Web Component `waffl-grid` (atributos/API) — só o CSS de layout é visível.
4. Shader do canvas WebGL do rodapé e o que desenha.
5. Conteúdo integral do CMS (campos por documento, imagens adicionais, textos de páginas internas).
6. IDs de GTM/GA4 e eventos personalizados.
7. Lista completa de `.af` por secção (só 2 pedidos capturados; restantes dependem do viewport/estado).
8. Contraste efetivo do corpo sobre cada fotografia.
9. Versão exata do GSAP (bundle minificado sem string de versão legível).

---

# Parte 2 — forgeautomotive.co.uk · plano e estado

Plano original de implementação. O que foi executado — e os desvios (Nuxt em vez
de Next, Newsreader em vez da PP Editorial New, canvas de estrelas em vez do
scrub HEVC) — está em `PROGRESS.md`, iterações 1–8.

Base factual: Parte 1 deste ficheiro. Tudo o que lá está `[NÃO DETERMINADO]` é tratado aqui como decisão de engenharia, não como facto do original — cada uma está marcada com ⚠ e justificada.

---

#### 1. Stack recomendada

| Camada | Escolha | Porquê |
|---|---|---|
| Framework | **Next.js 16.3.5 (App Router, Turbopack) + React 19 + TypeScript** | É a stack do original (Next 16.3.5, React 19.3 canary). O App Router dá RSC/prefetch (`?_rsc=`), que o site usa para pré-carregar `/builds`, `/stock`, `/contact`, `/legal`. |
| Estilo | **styled-components** (runtime, SSR registry) | O original injeta 799 regras em `<style data-styled>` e usa classes `sc-<hash>-<n>`. Manter a tecnologia evita reescrever a folha de estilos e preserva a mecânica de overrides por componente. ⚠ Alternativa mais barata de manter: CSS Modules + variáveis; perde-se a paridade de classes mas ganha-se build mais simples — só recomendo se o clone for evoluir muito. |
| Scroll | **Lenis 1.3.26** | Igual ao original; o scroller é a `div.lenis` (não a window) — crítico para sticky, progresso e o scrub. |
| Animação | **GSAP + ScrollTrigger + SplitText + @gsap/react** | O original registra exatamente estes três plugins. `useGSAP` para limpeza automática em React. |
| Fundo “vídeo” | **ActiveFrame próprio sobre WebCodecs** (`VideoDecoder`, HEVC) | O original não usa `<video>`: usa contentores `.af` (chunks + manifest JSON + offset uint32) com scrub por timestamp. Reimplementar é ~250 linhas (ver §7). |
| CMS | **Sanity** (`ed72g2cx`/`production`) | Conteúdo e pipeline de imagem (`?auto=format&fit=max&w=`) vêm daí. Para o clone,Schema próprio (ver §5). |
| Deploy | **Netlify** | Igual ao original (cache headers `Netlify Durable`), sem custo de infraestrutura. |
| Tipografia | **Geist** (OFL, via `geist` ou `next/font`) + serifada alternativa licenciada | GeistSans é livre. ⚠ “editorial” = PP Editorial New, **comercial**: licenciar ou substituir por serifada de peso 200 com métricas próximas (ex.: `Instrument Serif`, `Newsreader 200`) e ajustar `letter-spacing`. |

---

#### 2. Estrutura de pastas

```
forge-clone/
├─ app/
│  ├─ layout.tsx                # providers (Lenis, GSAP, StyledRegistry), fontes, metadata
│  ├─ page.tsx                  # home (composição das secções)
│  ├─ globals.css               # reset + tokens + @property + view-transitions
│  ├─ builds/page.tsx           # destino do CTA (stub)
│  ├─ stock/page.tsx
│  ├─ contact/page.tsx
│  └─ legal/page.tsx
├─ components/
│  ├─ chrome/SiteHeader.tsx     # header fixo: social, logo, menu button
│  ├─ chrome/ScrollProgress.tsx # barra 2px + scaleX
│  ├─ chrome/SiteMenu.tsx       # overlay NAVIGATE/CLOSE
│  ├─ chrome/SkipLink.tsx
│  ├─ sections/Hero.tsx
│  ├─ sections/Manifesto.tsx
│  ├─ sections/Approach.tsx     # H2 + p + CTA + LogoMarquee
│  ├─ sections/StickyPanels.tsx # 3 ou N passos: media sticky + coluna de texto
│  ├─ sections/ServicesIntro.tsx
│  ├─ sections/Services.tsx     # 6 passos
│  ├─ sections/BuildsTeaser.tsx
│  ├─ sections/StockTeaser.tsx
│  ├─ sections/EndsHere.tsx     # bloco + canvas WebGL
│  ├─ sections/SiteFooter.tsx
│  └─ ui/{Button,LogoMarquee,MediaLayer,PanelCard}.tsx
├─ lib/
│  ├─ lenis.tsx                 # provider + rAF loop
│  ├─ gsap.ts                   # registro de plugins (client-only)
│  ├─ active-frame.ts           # decoder WebCodecs
│  ├─ scroll-progress.ts        # store simples (subscribe) para a barra
│  └─ sanity/{client.ts,queries.ts,types.ts}
├─ sanity/schema/               # relic|service|marquee|siteSettings
├─ public/
│  ├─ active-frame/*.af         # (ou CDN)
│  └─ icons/*
└─ styles/ (se CSS Modules)
```

---

#### 3. Dependências

```bash
### base (versão do original)
npx create-next-app@16.3.5 forge-clone --ts --app --eslint --src-dir=false --import-alias "@/*"

cd forge-clone
npm i styled-components lenis@1.3.26 gsap @gsap/react
npm i @sanity/client next-sanity @sanity/image-url
npm i -D @types/styled-components eslint-plugin-react-hooks
```

Sem Tailwind (o original não usa). Sem `three` (o canvas é shader próprio; §7.4).

---

#### 4. Ordem de implementação

| # | Objetivo | Ficheiros | Critério de conclusão verificável |
|---|---|---|---|
| 1 | **Setup** Next 16 + TS + styled-components com SSR registry | `app/layout.tsx`, `lib/styled-registry.tsx` | `next build` sem warning de hydration de classes; `view-source` contém as `<style data-styled>` do SSR |
| 2 | **Tokens** e reset fiéis | `app/globals.css` | `getComputedStyle(document.documentElement)` devolve os 61 tokens; `html{font-size:62.5%}` e 11px a ≥1600px |
| 3 | **Lenis** como scroller interno | `lib/lenis.tsx`, `layout.tsx` | `html,body{overflow:hidden}`; `div.lenis` com `scrollHeight` ≈ soma das secções; `window.scrollY` fica 0 |
| 4 | **Chrome fixo** (header, logo, social, menu button, progresso) | `components/chrome/*` | header 110px a 1600; logo centrado a 44px do topo; barra 2px a 16px da base; `scaleX` acompanha o scroll |
| 5 | **Hero** com tipografia exata | `sections/Hero.tsx` | H1 a 64/72/90px em 390/700/1600, `editorial 200`, ls −2.2px, largura = colunas 4–10 |
| 6 | **Manifesto** | `sections/Manifesto.tsx` | segundo ecrã com H2 em 2 linhas, sem imagens de chrome |
| 7 | **Approach + marquee** | `sections/Approach.tsx`, `ui/LogoMarquee` | 14 logótipos, `li` 4rem→6rem, animação 20s linear infinita, máscara 30% nas bordas |
| 8 | **StickyPanels** (trio) | `sections/StickyPanels.tsx`, `ui/PanelCard`, `ui/MediaLayer` | wrapper 2700px; cartão 498×498 em col 3–6; texto em col 8–10; fundo com 3 camadas `inset:-1.6rem`, `opacity .4`, `blur .8rem`; cartão escondido <1024 |
| 9 | **Serviços** (6 passos) | `sections/Services.tsx` | wrapper 5400px; 6 blocos `100dvh`; contador por passo |
| 10 | **CTA + micro-interações** | `ui/Button` | hover: border 10→40%, label .6, letras sobem 4em com stagger .02s; foco tracejado; conic-gradient 4.5s |
| 11 | **Menu overlay** | `chrome/SiteMenu.tsx` | `aria-expanded`/`aria-controls`; labels sobem/descem em 1s `bezzy3`; links BUILDS/STOCK/CONTACT/LEGAL |
| 12 | **Ends Here / Builds / Stock / Footer** | `sections/*` | offsets do documento a ±8px dos valores do spec; footer 900px |
| 13 | **View transitions** | `app/globals.css`, links | navegação dispara `next-build` (1.2s, rise/dim) e o progresso sobrevive |
| 14 | **ActiveFrame** (scrub) | `lib/active-frame.ts`, `MediaLayer` | com um `.af` de teste: seek por scroll pinta o frame do timestamp; sem WebCodecs cai para poster estático |
| 15 | **Responsivo** | todos | tabela de breakpoints do spec reproduzida (H1, H3, cartão, coluna de texto, paddings) |
| 16 | **A11y + polimento** | vários | skip-link em `:focus-within`; `prefers-reduced-motion` desliga transições; outline 1px/4px; alt em todas as imagens; Lighthouse a11y ≥ 95 |

---

#### 5. Conteúdo e dados

- Schema Sanity mínimo: `relic`/`step` (`title`, `body`, `media { image, alt }`, `index`, `total`), `brand` (`name`, `logo`), `section` (`eyebrow`, `heading`, `body`, `cta { label, href }`), `siteSettings` (menu, socials, footer, cookie copy).
- Imagens via `@sanity/image-url` com `auto=format&fit=max&w=` (igual ao original: 390/640/3840).
- Enquanto o CMS não existe, `lib/content.mock.ts` com o texto de §7.1 do spec (é conteúdo real do site, útil para validar layout).

---

#### 6. Riscos e como contornar

| Risco | Impacto | Mitigação |
|---|---|---|
| **Assets proprietários** (fotografia, logótipos de marcas) | Legal + fidelidade | Usar placeholders com as mesmas dimensões e proporções; nunca hotlinkar `cdn.forgeautomotive.media` (Cloudflare bloqueia e é conteúdo de terceiros) |
| **Fonte PP Editorial New** (comercial) | Fidelidade tipográfica | Licenciar; ou substituir por serifada 200 com `size-adjust` semelhante e reajustar `letter-spacing` (−0.2rem) |
| **HEVC + WebCodecs** | Chrome só descodifica HEVC com suporte de hardware; Firefox não tem `VideoDecoder` HEVC | Estratégia em 3 níveis: `.af` → `<video muted playsinline>` com MP4/H.264 → poster estático. O próprio original já tem fallback em cascata de configs |
| **Scrub com 96–120 frames** | Jank em scroll rápido | Manter o desenho do original: `framesByTimestamp`, `_needsKeyFrame`, flush só em idle (250ms), `hardwareAcceleration:'prefer-hardware'`, limite de recuperações 3 |
| **styled-components + RSC** | Estilos “a saltar” | Registry de SSR + `useServerInsertedHTML`; marcar componentes com `'use client'` apenas onde há animação |
| **Lenis + sticky** | Secções não fixam | O sticky é CSS dentro do wrapper que faz scroll; nunca aplicar `transform` ao `.lenis` (quebra o `position:sticky`) |
| **View Transitions** | Safari/Firefox parciais | `@supports` + fallback de fade com `#page:after` |
| **Cloudflare em automação** | Screenshots sem imagens (aconteceu) | Para QA visual, UA de browser real (`--user-agent` sem “HeadlessChrome”) ou mocks locais |
| **GSAP timings `[NÃO DETERMINADO]`** | Reveals “quase” iguais | Medir no original com `performance.now()` em torno do primeiro paint do H1 e calibrar por comparação de vídeo (60fps), documentando os valores escolhidos |
| **Shaders do canvas do rodapé** | Efeito em falta | Tratar como opcional (P2): ruído/gradiente animado até haver referência |

---

#### 7. Decisões técnicas para o que o spec não fecha

1. **Reveal de texto**: `SplitText` por linhas (`type:"lines"`), `y:110%` → `0`, `duration:.9`, `ease:"expo.out"`, `stagger:.06`, disparado no `load` do hero e em `ScrollTrigger` (`start:"top 80%"`) nas restantes. ⚠ valores a calibrar.
2. **Troca de passos**: um `ScrollTrigger` por painel (`start:"top top"`, `end:"bottom bottom"`, `scrub:true`) que publica `progress` num store; o componente escolhe `index = clamp(floor(progress * n))` e anima z-index/opacity das camadas. ⚠ o original pode usar tween contínuo em vez de degraus discretos.
3. **Progresso**: `scaleX(0.0005 + p * 0.9995)` — o original arranca em `0.0005` (nunca 0) para evitar divisão por zero em transições.
4. **Canvas do rodapé**: começar com um shader de ruído/gradiente lento (1 plano, `gl_FragColor` com `snoise`), apenas se sobrar tempo; caso contrário, omitir e anotar no checklist.
5. **Menu**: overlay full-screen com `nav[aria-label="Menu"]`; o original não expõe `role="dialog"`, portanto replicar como `<nav>` + `aria-expanded` (não inventar diálogo).

---

#### 8. Checklist de fidelidade

Medir com o clone e o original lado a lado, a **1600×900** e a **390×844**.

**Estrutura**
- [ ] `div.lenis` é o scroller; `document.scrollingElement.scrollTop` fica 0
- [ ] Altura total do documento ≈ **17.862px** @1600×900 (±1%)
- [ ] Offsets das secções: 1170 (approach), 3160 (painéis), 5860 (intro serviços), 6461 (serviços), 12311 (ends here), 15162 (builds), 16062 (stock)
- [ ] Wrappers de 2700px (3 passos) e 5400px (6 passos)

**Grelha e tipografia**
- [ ] 12 colunas: 98.14px + gap 35.2px @1600; padding 123.2px / 17.6px
- [ ] H1 90px/108px, ls −2.2px, capitalize, colunas 4–10
- [ ] H3 105.6px/126.72px @1600; 58px @≤1024
- [ ] Corpo 19.8px/27.72px, ls −0.55px, `rgba(242,241,237,.8)`
- [ ] Micro-label 11px/600, ls 3.3px, uppercase
- [ ] `html` font-size 10px / 11px / 12px por breakpoint

**Componentes**
- [ ] CTA: 254×59 @1600, border 1px 10%, bg 10% preto, blur 4px, hover border 40% + letras a subir 4em com 0.02s de stagger
- [ ] Progresso: 2px, 16px das margens, fill `#F2F1ED`
- [ ] Header: 110px, logo a 44px do topo, botão menu com padding 44px
- [ ] Marquee: 20s linear, `li` 6rem @≥1024, máscara 30%
- [ ] Cartão de fase 498×498, sticky; fundo `inset:-1.6rem`, `opacity .4`, `blur .8rem`

**Responsivo**
- [ ] 390: cartão oculto, social oculto, H1 64px, coluna x 24 w 342
- [ ] 1024: cartão visível (395px), social visível, coluna x 613 w 309
- [ ] 1440: H3 96px, cartão 448px
- [ ] 1600: tokens a 11px

**Interação**
- [ ] Roda do rato faz scroll suave; ancoragens e `scrollTo` funcionam
- [ ] Passos trocam de imagem e texto na mesma posição de scroll (±40px)
- [ ] Menu: label “Navigate” → “Close menu”, `aria-expanded=true`, links corretos
- [ ] Focus-visible 1px offset 4px em todos os interativos; skip-link aparece no primeiro Tab
- [ ] `prefers-reduced-motion: reduce` remove transições de página e liberta o scroll

**Performance**
- [ ] Nenhum layout shift ao trocar de painel (CLS < 0.02 no trecho hero→serviços)
- [ ] Scrub sem quedas abaixo de 50fps num portátil integrado (gravar com DevTools Performance)
- [ ] Imagens servidas nos tamanhos 390/640/1280/3840 e em AVIF/WebP

**Acessibilidade/SEO**
- [ ] Hierarquia H1→H2→H3 sem saltos
- [ ] Todos os `<img>` com alt não vazio (exceto decorativos)
- [ ] `title`, `description`, OG e `theme-color #0c0c0c` idênticos
- [ ] `lang="en-GB"`

---

# Parte 3 — jesperlandberg.com · extração

### 3.1 Metadados

`https://jesperlandberg.com/` · 2026-10-29 · REA (CDP passivo, Chrome 156, 921×948) + HTML SSR + chunks `/_nuxt/*`. Todos os valores abaixo foram medidos; o resto ficou `[NÃO DETERMINADO]`.

**Modelo mental (auto-revelado no console):** *"every pixel you can see is WebGL. the DOM is real — it does the layout and catches your clicks — but it paints nothing."* O DOM só faz layout e hit-testing; o canvas GL pinta planos que seguem os `getBoundingClientRect` dos elementos.

### 3.2 Stack

| Camada | Valor | Evidência |
|---|---|---|
| Framework | Nuxt 4.x (SSR + `__NUXT__` payload) | `data-nuxt-data="nuxt-app"` |
| Build | Vite/Nitro (chunks `/_nuxt/*.js`) | padrão de build |
| CSS | **Tailwind v4** (variantes `has-`, arbitrary properties) | reset compilado |
| Escala | utilitários `--spacing: 0.1rem` (`px-20` = 2rem) | valores compilados |
| 3D | **three.js r185** | `data-engine` no `<canvas>` |
| Animação | GSAP | `_gsap` nos chunks |
| CMS | **DatoCMS** (GraphQL + assets `datocms-assets.com`) | `__NUXT__.config` |
| Texto GL | atlas de glifos próprio (`/glyphs/<id>.json` + `.bin`, SDF) | fetch no entry chunk |
| Imagens | `/textures/manifest.json` → `.ktx2` (basis transcoder) | manifest + loader |
| Form | `POST /api/subscribe` | chunk próprio |

### 3.3 Design system

| Token | Valor |
|---|---|
| Cores | `#000` (fundo), `#fff` (texto), `#fff3` (selection), opacidades `.4/.5/.6` para estados, `#eee` e dourado `#d9a441` sem uso visual confirmado |
| Fonte | **ABC Diatype Plus Variable** (paga), `font-weight: 200–1000`, `body{font-family:sans}` |
| Raiz fluida | `font-size: clamp(5px, 20px, 10 * 100vw / var(--size))`; `--size: 390` → `1500` a partir de 650px (1rem ≈ vw/150, teto 20px) |
| Corpo | `1.4rem / 1.4` |
| `.label` | `1rem`, 500, uppercase |
| Escala de texto | `.8 / 1.4 / 1.6 / 1.8 / 3.5rem` (`text-8…text-35`) |
| Tracking | `-0.02em` (corpo), `-0.035em`, `-0.05em` (títulos de card) |
| Espaço | múltiplos de `0.1rem` (`px-40` = 4rem, `py-25` = 2.5rem, `gap-x-20` = 2rem, `size-25` = 2.5rem) |
| Raios | `1.5rem` (mobile), `2rem` (desktop), `9999px` (pills) |
| z-index | `40` chrome/painéis, `99` loader |
| Breakpoints | `650` (única mudança de layout: `s:`), container `1100/1300/1400` |

### 3.4 Estrutura e comportamento

- Ecrã fixo, sem scroll de página: canvas GL em `z 0`; chrome fixo em `z 40`; loader em `z 99`.
- Carrossel horizontal de cards com efeito de túnel; roda/arrasto movem a faixa (`p` 0–1 com damping `.1/frame`); no mobile a faixa é vertical.
- Chrome: nome à esquerda, `Profile` à direita, `Featured / Full` e `Newsletter` em baixo.
- Painéis `Profile`/`Newsletter` abrem um “portal” (hole) escuro com anel; texto GL revelado por linha com efeito de slot-machine.
- Loader: 3 barras centrais; saída do overlay `0.35s` + barras `0.42s`.
- Estados de hover: pill `0.7s` in / `0.5s` out; labels mudam de opacidade em `.3s`; cards inclinam/“dentam” no hover (`.5s`).

### 3.5 Assets e dados

Imagens em DatoCMS convertidas para `.ktx2` (basis), atlas SDF por glifo, sem ícones/sliders vídeo. Rotas: `/` (home), `/full` (índice), `/newsletter`, `/projects/<slug>`, `/api/subscribe`, `/llms.txt`, `/textures/manifest.json`.

### 3.6 Acessibilidade e SEO

Um único `h1`/`h2` em `.sr-only` (a hierarquia visual é texto GL), `.label` uppercase, `aria-expanded` nos painéis, `Escape` fecha, foco visível por outline do browser, sem `prefers-reduced-motion` implementado no original.

### 3.7 Lacunas

Versão exata do Nuxt/bundle, token público do DatoCMS já visto mas schema real, uso visual de `#eee`/dourado, resposta real do `/api/subscribe` e timings do portal (aproximados por captura).

---

# Parte 4 — jesperlandberg.com · plano

### 4.1 Stack escolhida

Nuxt 4.6.3 + Vue 3.5 + TypeScript, Tailwind v4, **three.js r185**, **GSAP**, `@fontsource-variable/inter` como substituto da ABC Diatype Plus (paga, com compensação de peso/tracking). Dados mockados (`app/data/projects.ts`) e `/api/subscribe` simulado.

### 4.2 Estrutura

```
app/
├─ app.vue            # shell: GlCanvas + main fixo + painéis + chrome + loader
├─ components/        # FeaturedCarousel, GlCanvas, SiteChrome, ProfilePanel,
│                     # NewsletterPanel, ProjectModal/Sheet, BootLoader
├─ composables/       # useGl (singleton), usePanels, useProjectModal, gl/{engine,shaders,textCanvas,choreo}
├─ data/projects.ts   # 8 projetos (título, descrição, rácio, textura)
└─ assets/css/main.css# tokens @theme + reset do original
```

### 4.3 Ordem executada (12 etapas)

1. Scaffold Nuxt → 2. tokens exatos → 3. chrome (`SiteChrome` + sr-only) → 4. mock de dados e API →
5. cards no DOM (rácios, `data-gl`) → 6. núcleo GL (câmara 1px = 1 unidade, follow de rects) →
7. texto GL (canvas 2D por linha + slot-machine) → 8. cards GL (texturas + máscara arredondada) →
9. carrossel (roda/arrasto, túnel) → 10. painéis + loader → 11. rotas `/full`, `/newsletter`, catch-all →
12. responsivo + a11y.

### 4.4 Riscos tratados

Fonte paga → Inter com compensação; assets do CMS → placeholders com a mesma proporção; GL + DOM a dessincronizar → follow por rects com `FOLLOW_LERP = 0.1`; portal do original sem like-for-like → aproximação por shader; `prefers-reduced-motion` inexistente no original → mantido igual.

---

# Parte 5 — jesperlandberg.com · auditoria original↔clone

Duas rondas lado a lado (375/768/1280/1920, zoom 100%), `getBoundingClientRect` e
computeds dos dois lados. Relatório completo (529 linhas) no histórico do git.

| Ronda | Críticas | Altas | Médias | Baixas | Resultado |
|---|---|---|---|---|---|
| 1 (manhã) | 4 | 6 | 9 | 7 | críticas/altas/médias corrigidas |
| 2 (tarde) | 0 | 5 | 11 | 9 | correções aplicadas e re-medidas |

**Diferenças aceites por design:** texturas placeholders (licença), Inter em vez
da ABC Diatype Plus, `/api/subscribe` mockado, painéis sem o portal de
iluminação. O pixel-diff global (32–85%) vem das texturas e da fonte — as caixas
medidas batem ao pixel.

**Corrigido na 2.ª ronda:** `CARD_VISUAL_SCALE` (cards “colados”), texto a
flutuar sobre a superfície curva, cursor sempre visível, pílulas com três
iconografias distintas.

---

# Parte 6 — modelo para um novo alvo

Ao clonar outra página, acrescentar `Parte N` com: metadados da extração ·
stack com evidência · design system (tokens exatos, tipografia, grelha,
breakpoints) · estrutura e layout com offsets · componentes e estados ·
comportamento (gatilhos, durações, easings) · assets · dados e rede ·
a11y/SEO · lacunas `[NÃO DETERMINADO]` · plano (stack, pastas, dependências,
ordem com critério verificável, riscos, checklist de fidelidade).

Regra de ouro: **um valor só entra depois de medido**; sem medição, fica
`[NÃO DETERMINADO]` com justificação — nunca um número inventado.
