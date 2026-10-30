# CLONE_SPEC.md — jesperlandberg.com (homepage) — extração REA+CDP+SSR

Origem: `https://jesperlandberg.com/` capturado em 2026-10-29 via REA (CDP passivo, Chrome/156.0.8078.47, viewport 921×948) + HTTP GET do HTML SSR + análise estática dos chunks `/_nuxt/*`.html Todos os valores abaixo são exatos (fonte: HTML/CSS/JS/manifests). `[NÃO DETERMINADO]` = não observável passivamente.

**Modelo mental do site (auto-revelado no console)**: "every pixel you can see is WebGL. the DOM is real — it does the layout and catches your clicks — but it paints nothing. the planes graze on their elements' rects and follow them wherever they wander. CSS still owns every size, corner and colour. pages claim planes by `data-id`. when two routes name the same id, the plane just trots over to its new element — the transitions are herd behaviour… one clock leads, everyone follows." Stack (banner): **Nuxt · Three.js · GSAP · DatoCMS**.

## 1. Stack e tecnologias

| Camada | Valor | Evidência |
|---|---|---|
| Framework | Nuxt (SSR/hydro-data `data-nuxt-data="nuxt-app"`; `window.__NUXT__.config` com `buildId`). Versão exata do bundle `[NÃO DETERMINADO]` (eração Nuxt 4.x) | script inline; `<div id="__nuxt">`; `<div id="teleports">` |
| Bundler | Vite/Nitro (chunks com sumários de conteudo-style — não só `vite import.meta` diretamente visível) | padrão `/_nuxt/*.js` |
| CSS | **Tailwind v4** (reset `--tw-border-spacing-x…`, `arbitrary properties`, `has-` variants), classes minificadas | reset em `css1` |
| Escalas | utilitários disruptivos: `text-14`=`1.4rem`, `px-20`=`2rem` → **unidade multiplicador base `0.1rem`** (Tailwind `--spacing` percentual custom) | valores compilados |
| 3D | **three.js r185** (`qm="185"`, `three.js r${qm}` no `setAttribute('data-engine')`) | chunk `DZyj3ghP.js` |
| Animação | GSAP (`registerPlugin`, `_gsap`) | idem |
| CMS | **DatoCMS** (token público no client: `fc11112cf1e70c9b1c00659c468723`; endpoint `https://graphql.datocms.com/`; assets `www.datocms-assets.com/223669/...`) | `__NUXT__.config` + chunk |
| Textura de texto | pipeline próprio: `/glyphs/<id>.json` + `/glyphs/<id>.bin` (atlas SDF/rosto por glifo), raw GL:** instancing por glifo | `fetch()` no entry chunk |
| Imagens | `/textures/manifest.json` (JPG DatoCMS → `.ktx2` pré-converso com `basis_transcoder.o4Hde_L7.js`) | manifest + loader basis |
| Newsletter | `POST /api/subscribe` | chunk `CSMsEA09.js` |
| Ícones/UI/maps | nenhum (não há ícone, slider externo, vídeo) | HTML |

Chunks: `DZyj3ghP.js` (1.1MB, entry: three+GSAP+app), `DJ70QaFT.js` 59.7K, `Dhdylg00.js` 44.7K (np prefetch), `rY37MP56.js` 11.4K, `mriNB3Nt.js` 6.7K (carrossel `[CAR]/[COL]`), `CHzWqGxK.js` 4.8K (página `/full`), `CSMsEA09.js` 4.4K (form newsletter), `DNYapgHJ.js` 3.7K, `D6Jn8M47.js` 0.7K, `basis_transcoder.o4Hde_L7.js` 57.5K. Todos ES modules.

## 2. Design system

### 2.1 Cores
| Cor | Valor | Uso |
|---|---|---|
| Preto | `#000` | body bg; card pill bg; loader bg; borda implícitas `#0000` |
| Branco | `#fff` | texto; botão subscribe bg; tarjas pill texto branco |
| Branco 20% | `#fff3` | selection bg (`selection:bg-white/20`) |
| Branco `.40/.50/.60/.100` | `rgba(255,255,255,x)` | estados (`opacity-40/50/60/100`): Full link base `.5`, hovers `.6` |
| `#eee` | identificado no CSS compilado | `[NÃO DETERMINADO] uso visual` |
| Dourado | `#d9a441` / `rgb(217 164 65)` | regra presente, uso `[NÃO DETERMINADO]` (provável destaque de contagem "77 awards") |

Sem gradientes, sem sombras. Somente opacidades.

### 2.2 Tipografia
| Propriedade | Valor exato |
|---|---|
| Fonte | `@font-face font-family:sans; font-weight:200 1000; src:url(/_nuxt/ABCDiatypePlusVariable.DURmIfav.woff2) format("woff2-variations"); font-display:swap` = **ABC Diatype Plus Variable (ABC Dinamo)** — paga. `body{font-family:sans,sans-serif}` |
| Raiz fluida | `html{font-size:clamp(5px,20px,10 * 100vw/var(--size))}` com `:root{--size:390}` e `@media(min-width:650px){:root{--size:1500}}` (cópia literal; 1rem ≈ vp/150, teto 20px) |
| Body | `{font-size:1.4rem; font-weight:400; line-height:1.4}` |
| `.label` | `{font-size:1rem; font-weight:500; text-transform:uppercase}` |
|Sizes usados| `text-8 .8rem`, `text-14 1.4rem`, `text-16 1.6rem`, `text-18 1.8rem`, `text-35 3.5rem` |
| Letter-spacing | `-0.02em` (corpo/labels), `-0.035em` (algum bloco), `-0.05em` (títulos de card) |
| Suavização | `-webkit-font-smoothing:antialiased`, `-webkit-text-size-adjust:none` |

Nenhum `h1..h6` com tamanho custom: **um único h1 (sr-only)** e h2s sr-only; tudo é texto de mesmo corpo (14rem-scale) — hierarquia vem de label/espaçamento.

### 2.3 Espaço/estrutura
`--spacing` de base = `0.1rem` (múltiplos): `px-20=2rem`, `px-40=4rem`, `px-80=8rem`, `py-25=2.5rem`, `py-40=4rem`, `gap-x-5=.5rem`, `gap-x-8=.8rem`, `gap-x-20=2rem`, `gap-y-8=.8rem`, `gap-y-20=2rem`, `mt-15=1.5rem`, `mt-25=2.5rem`, `mt-30=3rem`, `inset-x-10=1rem`, `inset-x-20=2rem`, `bottom-10=1rem`, `size-25=2.5rem`, `h-40=4rem`, `h-45=4.5rem`, `w-420=42rem`, `w-600=60rem`, `w-50=5rem`, `h-5=.5rem`; margin `mt-25/30` só nos shields.
`s:` (= `min-width:650px`) e a variação estática `--size` mudam nesta própria largura. Container: breakpoints `650/1100/1300/1400` com `max-width` (usados no reset tailwind; página em tela cheia não consome container).
Radius: `rounded-15 = 1.5rem` (mobile card), `rounded-20 = 2rem` (desktop card), `rounded-'2rem` nas barras (`rounded-[2rem]`), `rounded-full` pills/buttons.
Z-index: `.z-40` U.Interfaces fixas (chrome/panels/hud), `.z-99` loader-out. NV h/`br` `--tw-` internals irrelevantes.

## 3. Estrutura e layout (homepage)

Árvore real (SSR, 331 nós; classes exatas reproduzidas na 4):

```
html(lang=en)
 └ body
    └ #__nuxt > div.bg-black            ← fundo + base de arte GL
       ├ div.gl                          ← container do canvas WebGL (canvas só no client)
       ├ main.fixed.inset-0.overflow-hidden
       │  ├ div.sr-only                  ← conteúdo acessível completo (textos a seguir)
       │  │   ├ h1 "Jesper Landberg — design engineer"
       │  │   ├ p  bio (146 chars), p "77 awards — 30× Awwwards, 40× FWA, 3× Webby, 2× Lovie."(54)
       │  │   ├ p  newsletter-CTA? (214 chars)
       │  │   ├ h2 "Featured work" + ul (8 li > a /projects/<slug>)
       │  │   └ h2 "Elsewhere" + ul (Full, Newsletter, Instagram, X, LinkedIn, mailto, /llms.txt)
       │  └ div.absolute.w-full.left-0.top-0.s:top-1/2.flex.flex-col.s:flex-row.s:-translate-y-1/2
       │     └.. gap-y-20 s:gap-x-10 px-20 s:px-0   ← o carrossel de cards
       │        (8×) article.relative.w-full.s:h-[43.5svh].s:max-h-[55rem].flex-none
       │             .cursor-pointer.rounded-15.s:rounded-20 [aspect-ratio custom, data-id, data-gl=card]
       │             └ p.pointer-events-none.absolute.bottom-10.inset-x-10.s:bottom-10.s:inset-x-20
       │                  flex.items-end.justify-between
       │                  ├ span[data-title].text-16.s:text-18.tracking-[-0.05em].whitespace-nowrap
       │                  └ span.invisible.size-25.rounded-full.bg-black.text-white[aria-hidden]  (GL seta/ícone pintado)
       ├ (fixed z-40, w-420 s:w-600, inert, center) div[data-gl-shield] — PAINEL PROFILE
       │     (p text-14 leading-14 tracking-[-.02em] max-w-35rem s:max-w-45rem;
       │      p.label.opacity-60 mt-25/30;
       │      ul flex gap-x-20 gap-y-8 — Instagram/X/LinkedIn/Email links data-gl=text)
       ├ (fixed z-40, w-420 s:w-600, inert, center) div[data-gl-shield] — PAINEL NEWSLETTER
       │     (p max-w-30rem s:max-w-32.5rem; form mt-25/30 flex gap-x-8 novalidate aria-busy
       │      [email pill h-40 s:h-45 rounded-full bg-black + button round bg-white text-black size-40 s:size-45]
       │      esconder honeypot "company"; status [role=status][aria-live=polite].label.min-h-1.2em)
       ├ main-chrome (fixed z-40 inset-0 flex-col justify-between px-40 py-25 s:px-80 s:py-40)
       │     A: home link `.label` "Jesper Landberg" + botão "Profile" (aria-expanded toggle)
       │     B: nav.label[aria-label="Project views"] "Featured"(ativa) · span aria-hidden "/" · a "Full"(opacity-50)
       │           + botão "Newsletter" (aria-expanded, bottom right)
       ├ div.fixed.inset-0.z-99.bg-black        ← loader/fade de boot
       └ (fixed z-40 center) flex gap-x-8 → 3× div[data-gl=bar].h-5.w-50.rounded-[2rem]   ← barra(s) do loader
 └ #teleports (vazio; menu/overlays client-side)
```

Texto visível na 1ª dobra (desktop, ordem de arte): título "Jesper Landberg" (label), sobre (bio), "77 awards — 30× Awwwards, 40× FWA, 3× Webby, 2× Lovie" (com dígitos em **slot-machine**), carrossel de 8 cards com nomes sobrepostos + seta circular, chrome (header + footer), load-bars.

### Breakpoints
| Faixa | `--size` | Layout |
|---|---|---|
| < 650px | 390 | cards full-width empilhados (coluna), px-20, gap-y-20, `top-0`, radius 1.5rem, títulos 1.6rem, painéis w-42rem, botões 4rem |
| ≥ 650px | 1500 | carrossel horizontal (fila), `s:top-1/2 -translate-y-1/2`, gap-x-1rem, radius 2rem, títulos 1.8rem, painéis w-60rem, botões 4.5rem |

`@media(hover:hover) and (pointer:fine)`: `has-hover:hover:opacity-100/60` efeitos; trailers `.transition-opacity.duration-300/500` `cubic-bezier(.23,1,.32,1)` e default; `@media(hover:none),(pointer:coarse)` troca só `font-size:max(1.4rem,16px)` do input. Sem `prefers-reduced-motion`.

## 4. Componentes (estados)

| Componente | Estrutura | default | hover | focus | disabled/estado |
|---|---|---|---|---|---|
| Card (8×, `data-gl=card`) | article|p|span título+pill | cursor-pointer; radius 1.5/2rem; ratio dado; pill bg-black texto-1+ícone gl | `[NÃO DETERMINADO] micro-escala/parallax do plano` (visto só via GL) | — | click → rota `/projects/:slug` (post-load route) |
| Nav views | a.label ×2 + seperador span `/` | Ativa: opacity 1; Full: opacity-50 | Opace até 1 (`duration-500 ease-out`) | `before:-inset-15` hit área | router-link-active/exact |
| Botões Profile/Newsletter | button.label | aria-expanded=false; hover opacity .6 (300ms ease-out) | — | `before:-inset-15` | toggle painéis (inert) |
| Home "Jesper Landberg" | a.label | hover .6 | — | hw área | vai ao topo |
| Link social / mailto | a.label pointer-events-auto | hover .6 (dentro do shield) | — | — | target=_blank rel noopener |
| Form newsletter | email + honeypot + botão | aria-busy=false | hover: pill troca texto? `[NÃO DETERMINADO]` | caret white, selection white/20 | disabled:pointer-events-none quando busy; `autofill:` hacks |
| Loader | 3 barras data-gl=bar | h-5 w-50 rounded-2rem; bg `[NÃO DETERMINADO]` (provável branco branco .1→1) | — | — | some em z-99 fade |
| Shield panels | div[data-gl-shield] | inert + pointer-events-none até opened; texto `-webkit-text-fill-color:transparent` (o paint é GL) | — | — | aberto por botões |

## 5. Comportamento e interação

1. **Boot**: tela z-99 preta com 3 barras centradas `data-gl=bar` (progress), depois revela página. Timing `[NÃO DETERMINADO]` (provável GSAP timeline ~0.6–1.2s).
2. **Grelha GL (constante)**: raster天地 da canvas full-viewport atrás do main; planos pegam o `rect` de cada elemento `data-gl=text / card / bar / shield` e seguem (mesmo clock). Texto = color #fff; background = #000.
3. **Carrossel**: fila horizontal de cards; wheels/drag/touch move o conteúdo ([CAR] log medindo). Bordas **curvam em túnel 3D** (shader uniforms `u_tunnelR/Y/P`, `u_fadeAng`) — wrap quando nos extremos; fade nos外壁; "herd" transitions entre rotas via `data-id` igual (flight shared element).
4. **Texto tipo "reveal" por linha**: máscara e stagger por linha, dígito slot-machine no contador de prêmios (shader com aNachrichten), recalc em resize ([CAR] measure).
5. **Painéis Profile/Newsletter**: togglam `aria-expanded`, painéis `inert` off, fade/anim `transition-opacity .3/.5s` + sync GL.
6. **Hover links**: transição de opacity .6 (300ms) ou 1 (500ms p/nav).
7. **/llms.txt**: página data de documentação para agentes.

## 6. Assets (lista de referências — o clone NÃO copia bytes)

| Asset | URL | Formato | Função |
|---|---|---|---|
| Fonte variável | `/_nuxt/ABCDiatypePlusVariable.DURmIfav.woff2` (115148 B) | woff2-variations | tipografia toda — **sem licença para copiar** |
| Favicon set | `https://www.datocms-assets.com/223669/1786371616-face.png?auto=format&h={16,32,96,192,57,60,72,76,114,120,144,152,180}&w=<size>` | png | favicon/apple-touch/ms-tiles (retrato de Jesper) |
| OG image | `.../1786435410-share.webp?…h=630&w=1200` | webp | Open Graph/Twitter |
| Thumbs GL | `…/01CbIdBLVCiUlQLMC8Ct3vq014VS02lwCaq/thumbnail.jpg` → `.ktx2`; idem para `HofYkQ00DP02B202026iOjEsHVlOHoXqJB02y`, `vi01EDz6SgCaJhFpBpz7qeUoqmZHj9r3x`, `tDmMyBorLlYpZ1JxKmZqHu6cRAy3Jeq6`; DatoCMS `1785656629-image-39`, `1785656633-tlb4`, `1785656645-image-84`, `1785656656-image-83`, `1785656663-image-2`, `1785656706-ny3` (manifest parcial — outros `[NÃO DETERMINADO]`) | jpg+KTX2 | texturas dos 8 cards |
| Glyphs | `/glyphs/<id>.json`, `/glyphs/<id>.bin` | json/bin | atlas de texto SDF |
| Ratio cards | 2048/1172 (nathan-riley), 2048/1204 (casa-di-solare), 1250/720 (the-lookback), 2048/1114 (book-of-happiness), 3360/2200 (dogelon-mars), 1196/720 (gil-huybrecht), 1372/1029 (discoveryland), 1162/720 (griflan) | — | aspect-ratio inline |

## 7. Dados e rede observados

- `_payload.json?_b=dae78082-791f-45e5-83d8-7af79c012859` (48768 B, preloaded): estado hidrata shared `{projects, site, featured}.`
- `POST /api/subscribe` (newsletter; campo `email`, honeypot `company`).
- DatoCMS GraphQL: endpoint `https://graphql.datocms.com/` + token acima (6.7K query própria).
- `/api/subscribe` resposta [NÃO DETERMINADO] → mock clone `{ ok: true, message }`.

## 8. Acessibilidade e SEO

- `sr-only` centraliza TODO conteúdo (h1+h2s+listas) já que visual = GL; headings corretíssimos; aria-hidden em spans decorativos.
- Chrome invert: `aria-label="Email address"`, `aria-label="Subscribe"`, `role=status aria-live=polite`, honeypot `tabindex=-1 aria-hidden`.
- `main.fixed.inset-0` mas com sr-only, teclado também pega os `<a>`s/inert panels; foco visível não estilizado custom (rely default nenhuma custom) — [NÃO DETERMINADO] ordem de foco pós-CSS hidden (hover não ar á视线).
- meta: description, og/tw completo, canonical, favicon/apple set, JSON-LD `Person`+`WebSite`+`ProfilePage` (descrição exata no ld.json do disco: knowsAbout, award claim, sameAs).
- `llms.txt` presente.

## 9. Apêndice — captura headless 2026-10-29 (921×948, WebGL ativo)

Evidência: screenshot original em `/tmp/omp-sshots-15b9bc95f9f54741.png` (harness Chromium). Artefatos não observáveis via REA passivo:

| Fato | Valor observado | Implicação p/ clone |
|---|---|---|
| Piso 3D | grade fina em perspectiva, células ≈90px CSS, linhas cinza-dim, fog para o horizonte (~65–70% da altura) | mesh horizontal + shader de grid + fog |
| Túnel | vizinhos rotacionam em torno de eixo Y fora da tela; R ≈ 2× largura do viewport (estimado) | `uR ≈ 2vw`, fade angular no bordo |
| Enquadração inicial | card índice 1 (Casa Di Solare) CENTRADO ao boot; índice 0 cortado à esquerda | progress inicial centraliza índice 1 |
| Reflexo do título | eco tênue do título abaixo (P2) | plane secundário opacidade baixa |
| Cursor | dot GL pequeno no centro (cursor custom) | `[NÃO DETERMINADO]` — P2 |
| Sub-texto dim | linha(s) dim sob o título do card | plane secundário com desc |
| Círculos do card | mini-círculos no canto sup-right do thumb | parte da própria textura — sem ação |
