# PROGRESS.md — execução do clone

Base: `CLONE_SPEC.md` (valores exatos) + `CLONE_PLAN.md` (ordem).

## Assunções sobre itens [NÃO DETERMINADO] da SPEC

1. **Fonte**: ABC Diatype Plus é comercial → substituída por **Inter Variable** (self-host `@fontsource-variable/inter`).
2. **GSAP**: versão exata desconhecida → `gsap@^3.15` (npm resolve 3.15.0).
3. **Nuxt**: payload indica era Nuxt 4 → `nuxt@^4.6.3` resolve.
4. **Loader**: 3 barras z-99; timings assumidos (fade 0.35s + barras 0.5s stagger).
5. **Carrossel**: enterAll centraliza índice 1 ao boot (SPEC §9); entre cards o túnel R=0.75·vw, ramp 0.1→0.5; ajuste visual por comparação de screenshots (thead: left/right cards recuam ~9-20px em Z).
6. **/api/subscribe**: mock local `{ok, message}`; validação regex + honeypot `company`; resposta do original [NÃO DETERMINADO] → `{"ok":true,"message":"Thanks — you're on the list."}` isolado.
7. **Dourado #d9a441** não visível no screenshot original → NÃO usado.
8. **Excerpts dos cards**: só o `casa-di-solare` observado verbatim ("A contemporary versatile display typeface from Nikolas Type."); demais [NÃO DETERMINADO] → frase-base do `description` extraída. Campo `excerpt` em `app/data/projects.ts`.
9. **Links nos desc** (ex: "Nikolas Type" sublinhado no original) — não implementados; o texto é simples (`[INFERIDO]`).
10. **Cursor custom** do original (dot pequeno GL) — não determinado e não clonado; marcação emurtos `cursor-pointer`.
11. **Itens fora do escopo**: rotas `/projects/*` apontam ao catch-all; `/llms.txt` estático com conteúdo próprio ([NÃO DETERMINADO] do original).
12. **Verificação visual usou placeholders** (SVGs escuros, mesma proporção) em vez dos assets originais (regra: sem cópia).

## Dependências fora do plano (justificadas)

- `@fontsource-variable/inter` — substituto self-host da fonte paga.
- `typescript@^5` dev — exigido pelo Nuxt 4.

## Índice de progresso

| Etapa | Status | Evidência |
|---|---|---|
| 1 Scaffold (`nuxt prepare`, dev, build) | ✅ | `npm run dev` (nuxt-dev service, pid 66403→74945); `npm run build` ✨ complete in 3.87s |
| 2 Tokens (@theme exatos) | ✅ | `app/assets/css/main.css`; rem verificado = 6.14px @921 (clamp idêntico), interpolações exatas |
| 3 Layout base (chrome + sr-only + main) | ✅ | `app/app.vue`, `SiteChrome.vue`; padding px-40/py-25/s:px-80/s:py-40 = 24.56/49.12/24.56px |
| 4 Mock de dados + API | ✅ | `app/data/projects.ts`; `POST /api/subscribe` → 800ms e `{ok,message}` |
| 5 Cards DOM (ratios, data-gl, titles) | ✅ | `pages/index.vue` + `GlCard` inline; 43.5svh/max-55rem/rounded 15-rem |
| 6 GL núcleo (three r185, câmera 1px==1un, follow rects) | ✅ | `composables/gl/engine.ts`; data-engine: three.js r185 |
| 7 GL texto (canvas 2D por linha + slot-machine) | ✅ | `gl/textCanvas.ts`; reveal por linha, dígitos rolando (médio 0.9s) |
| 8 GL cards (texturas placeholders + mask rounded) | ✅ | shader rounded-Box; radius 12.28px = 2rem@rem6.14 |
| 9 Carrossel (roda/touch/drag + túnel) | ✅ | wheel+pwrap com `u_tunnelR/Y/P` equivalentes; `u_tunnelP` ramp observável |
| 10 Painéis + boot | ✅ | Profile/Newsletter toggles (aria-expanded + inert); BootLoader 3 barras exatidão |
| 11 Rotas /full, /newsletter, llms.txt, catch-all | ✅ | páginas retornam 200; conteúdo não-capturado documentado |
| 12 Responsivo + a11y | ✅ | mobile 390px: --size:390, axis y, desc hidden < :s; chrome = igual |
| 13 Verificação | ✅ | console sem erros/warnings; bio+awards verbatim读音; 8% fonte diffs; side-by-side (collage) |

## Bugs corrigidos durante a execução (aprendizados)

1. `v-model` + `value` no mesmo input — Vue Compiler SSR erro.
2. React-typecheck: `useGlEngine()` executado no SSR → moveu para callbacks client.
3. Reset manual CSS não-layered sobrescrevia o Tailwind preflight/layer utilities → removido.
4. `lineCount`/`window.__gl`/`readCss` refactors e regeneração de código cortado.
5. Vertex shader do túnel: mistura `sin(angleWorld*uP)` vs `sin(angleWorld)` — uso final `mix(flatTarget, alvo circular, uP)`.
6. Alpha do fragmento não multiplicava pelo alpha da textura — texto GL causava "caixa preta" no canvas dos cards.
7. `uFadeStart/End` do grid atualizados apenas no primeiro build — uniforms congelados em 1.6/9.
8. `fwidth`/derivadas em GLSL custom conforme three r185.
9. `line-height` do `.label` interferia em medida de canvas — coerente com original (leading-14 fix = 1.4).
10. `getComputedStyle().color` pode retornar `oklab()` — Canvas2D não aceita → fallback rgba.

## Evidências visuais

- Original (harness, 921×948, dpr 1.25): `/tmp/omp-sshots-15b9bc95f9f54741.png`
- Clone final: `/tmp/clone-final2.png`
- Side-by-side: `/tmp/compare.png`

## Fase de refinamento (motion + auditoria)

### O que mudou

1. **Choreografia real do original** (`Kp` extraída do bundle): entrada com cards `.1s/1.25s expo st.05 (from .5)`, stack rise `.25s/1.25s expo st.1 (rise .5)`, titles `.25s/1.25s st.075`, text `.35s/1.1s st.075`, pills `.5s/.85s expo st.075`; reveals linha-a-linha com os mesmos passos.
2. **Hover do card**: dente central (`u_dent=.1` da altura, `dome=(1-qx²)(1-qy²)`), `.5s expo` in/out, subdivisão 24×24; medido: 91.668 px alterados (antes 0).
3. **Pills**: hover escala 1.08 em `.7s expo` / `.5s expo`; raio SDF clampado (rounded-full 33M px corrompia a máscara).
4. **Links do painel**: hover dim para 60% em `.3s power2.out` (mesmo comportamento do `hoverText`).
5. **Portal (hole)**: disco+aro em `renderOrder` acima do carrossel; abre `.85s` / fecha `.65s` com easing **"folio"** (3 segmentos bezier do original, implementado exato); escala `.3s/.25s power2.out`; diâmetro `0.5144×vw` (fit 1280/1920); grade sofre bulge (`uHoleP`); cena escurece 38%; botão vira "Close"; rota `/newsletter` abre o painel; Escape/clique fora fecham.
6. **Grid**: célula 140px≈medida (144 css @1920), alpha .62, fog e **vignette inferior** (near fade).
7. **Mobile (375)**: track com intervalo próprio (centra card 1), túnel/grade desligados, título sobre desc (`bottom-0`), desc 2 linhas `text-14`.
8. **Tipografia**: texto GL em canvas 2× DPR; labels com `letter-spacing .05em` para compensar Inter (home 130px = original).
9. **Carrossel**: `driveCarousel` com tween do próprio engine (wheel .6s power2out; foco .85s expoOut); drag/touch preservados; **GSAP removido** (nenhum uso restante; clock próprio cobre tudo).
10. **Reduced motion**: engine desativa entrada/hover/ball; CSS zera transições.
11. **A11y**: painéis sem `inert` (como o original), gating por `setShieldOpen` + pointer-events; foco centraliza o card focado.

### Valores finais de movimento

| Elemento | Duração | Easing |
|---|---|---|
| Card entrada | 1.25s (+.05 stagger, atraso .1) | expoOut, from .5 |
| Stack rise | 1.25s (+.1 stagger, atraso .25) | expoOut, rise .5·altura |
| Título (reveal por linha) | 1.25s (+.075 stagger) | expoOut |
| Desc (reveal por linha) | 1.1s (+.075 stagger, atraso .35) | expoOut |
| Pill entrada | .85s (+.075 stagger, atraso .5) | expoOut |
| Hover card (dent) | .5s in / .5s out | expoOut |
| Hover pill | .7s in / .5s out, escala 1.08 | expoOut |
| Hover link | .3s, alpha→60% | power2Out |
| Hole abre/fecha | .85s / .65s | folio (bezier 3 segmentos) |
| Hole escala | .3s / .25s | power2Out |
| Carrossel (wheel/foco) | .6s / .85s | power2Out / expoOut |
| Loader fade | .35s | ease-out |
| Cursor ball | .35s in / .25s out | power2Out |

### Build / verificação

- `npm run build` ✔ (23s, 2.16MB / 546kB gzip).
- Console limpo após reload.
- Comparações nos 4 viewports: rects de card/título idênticos; célula de grade e portal batem.

## Rodada 3 — modais, presença, scroll e nitidez

- `components/ProjectModal.vue` + `components/ProjectSheet.vue` + `pages/projects/[slug].vue`; clique no card abre o modal (drag > 6px não abre), Escape/X fecham, foco vai ao botão fechar e volta ao sair.
- Slots de mídia vazios estilizados (5, ratios variados) — sem assets originais.
- Catch-all e rota inválida sem mensagem de escopo (“Not found”).
- Scroll: `nudge` com burst clamp ±0.12 e intenção ≥40px → avança/recua exatamente 1 card; snap 220ms; drag release com snap.
- Cards: `CARD_VISUAL_SCALE = 1.05` (presença) + placeholders regenerados a 1800px, tons mais claros.
- Nitidez: `renderer.setPixelRatio(min(dpr,2))` (resolvido em HiDPI).
- Metadados: `meta` nos projetos (casa = UNSEEN/2024; demais vazio).
- Build 16.5s; console sem erros; verificação de wheel (1 projeto/gesto) e modal (desktop+mobile).

## RODADA 5 (30/10)
- Shaders portados do bundle original (sheet/lean/floor/light) com câmera 53.4°.
- Piso reconstruído (grade .08, célula .22H, dissolve em vFar, contato) e dobradiça compartilhada.
- Texto GL: canvas 1:1 (dpr de dispositivo), sem mipmap, recriação de textura no resize, atualização em mudança de texto (Close/email/status), peso 700 + tracking .04em.
- Portal: raio .225W, aro escuro fino, dim só nos cards.
- Interações: hover de link (α×.6/.3s), pill lens + 1.03, seta preenchida; guarda de velocidade no boot.
- Modal: focus trap, indicador de scroll, tokens e classes compartilhadas (.sheet).
- Reduced motion: sem rear-up/wring, shimmer congelado, animações do sheet desligadas.

## RODADA 6 (30/10)
- V do sheet = tanh(restante/550)²; damp 0.1/frame; clamp de 1 viewport; snap removido (repousa entre cards como o original).
- Pill "mark" ↗; hover da pill do card destravado (hit span).
- Sheet do projeto virou moldura com scroll interno; X e anel de progresso fixos; chips com animações; SheetFrame compartilhado (modal + rota).
- Placeholders com grade/gradiente para a curvatura ler como superfície.

---

# Space Relics — integração com a base visual do forgeautomotive.co.uk (2026-10-31)

Fonte: `CLONE_SPEC.md` (valores exatos, extraídos ao vivo) + `CLONE_PLAN.md`.
Restrição do pedido: a integração acontece **no projeto Nuxt existente** (não num app Next novo), porque o portfólio 3D tem de sobreviver como 6.ª secção.

## Desvios assumidos (e porquê)

| Item | Spec/Plano | Execução | Motivo |
|---|---|---|---|
| Stack | Next 16.3.5 + React 19 | **Nuxt 4.6.3 + Vue 3.5** | O portfólio (three.js + engine próprio, painéis GL, modais) já vive aqui; um app Next obrigaria a reescrever tudo o que devia ser preservado |
| Fonte de display | `editorial` (PP Editorial New, comercial) | **Newsreader Variable** (`@fontsource-variable/newsreader`, OFL) | Licença; é a substituição sugerida no próprio plano (§6) |
| Fonte de corpo | GeistSans | **Inter Variable** (já no projeto) | Evitar mais uma dependência; peso e métrica próximos |
| Fundo animado | ActiveFrame/HEVC scrubbed | **Canvas 2D de estrelas** (`CosmosBackground.vue`) | Assets `.af` não são licenciáveis e o pedido foi "animação de fundo escuro e estrelado" |
| Marquee | logótipos de marcas | **nomes de missões** (Apollo 11–17, Opportunity, Spirit, Viking 1, Sojourner, Ingenuity, Lunokhod 1) | Marcas de terceiros fora do escopo do Space Relics |
| Secções | hero, manifesto, approach, painéis, serviços intro, serviços ×6, ends here, builds, stock, footer | **hero (2 fases), approach, 3 painéis, arquivo, ends, portfólio** | O pedido define 6 secções e nomeia a apresentação de 3 relíquias |
| Navegação | NAVIGATE + menu | removida (pedido) | Mantido apenas o botão Profile |
| Newsletter | painel + form + rota + API | **removidos** (pedido) | `NewsletterPanel.vue`, `NewsletterForm.vue`, `pages/newsletter.vue`, `server/api/subscribe.post.ts` |
| Chrome antigo | "Jesper Landberg", "Featured / Full" | removidos; logo central = **NASA** | Pedido: trocar a logo e retirar nome/featured |

## Passos executados (com verificação)

| # | Passo | Ficheiros | Verificação |
|---|---|---|---|
| 1 | Dependências | `package.json` (+`gsap`, `lenis@1.3.26`, `@fontsource-variable/newsreader`) | `npm i` ok; build 10,0 s |
| 2 | Tokens e camada forge | `app/assets/css/forge.css` | `getComputedStyle` devolve `--fr-*`; grelha 12 col com gap 35,2 px a 1600 |
| 3 | Fundo cósmico | `app/components/CosmosBackground.vue` | canvas 2D com ~520 estrelas, parallax por `scrollY`, `prefers-reduced-motion` sem cintilação |
| 4 | Header | `app/components/ForgeHeader.vue`, `ScrollProgress.vue` | logo NASA 120×35 px a 1600, social só ≥1024, Profile à direita em mobile, barra de progresso 2 px |
| 5 | Hero (2 fases) | `app/components/RelicHero.vue` | H1 "Space Relics" → H2 "Abandonados, mas não esquecidos." com crossfade por scroll (200vh sticky) |
| 6 | Approach | `app/components/RelicApproach.vue` | H2 105,6 px + marquee 20 s linear + máscara 30 % |
| 7 | Painéis das 3 relíquias | `app/components/RelicPanels.vue` | 3 × 100vh sticky, fundo `blur(8,8px)` `opacity .4`, cartão nítido cols 3–6 (498 px), texto cols 8–10, contador 01/03 |
| 8 | Arquivo + fecho | `RelicArchive.vue`, `RelicEnds.vue`, `ForgeCta.vue` | CTA com troca de letras no hover (stagger 0,02 s) |
| 9 | Portfólio como 6.ª secção | `PortfolioScene.vue`, `page/index.vue` | `FeaturedCarousel` reencapsulado; `data-scene="portfolio"` só com ratio > 0,99 |
| 10 | Roda do engine condicionada | `composables/gl/engine.ts` | carrossel só captura `wheel` na cena do portfólio; subir no início devolve o scroll à página |
| 11 | Painel Profile visível sobre as secções | `GlCanvas.vue`, `main.css`, `usePanels.ts` | `html[data-panel="profile"]` sobe o canvas para `z-index: 20` (o "hole" cobre o conteúdo) |
| 12 | Metadados | `nuxt.config.ts` | título/descrição/OG Space Relics, `lang="pt-BR"`, favicon NASA |

## Assets

- `public/images/relics/{apollo-lunar-module,opportunity,viking-1}.jpg` — 1376×768 (Viking 1408×768), copiados de `public/images/*.jpeg` para nomes sem acentos.
- `public/images/nasa-logo.png` — 2625×765, usado no header (h 26/30/35 px) e como favicon.
- `public/images/cosmos_cintilante.gif` — **não usado** (o fundo é canvas 2D, mais leve que 1,5 MB de GIF).

## Dívida conhecida

- Copy do painel Profile ainda é a do portfólio (bio "Jesper Landberg…"), por pedido de "manter o profile".
- Rotas `/full`, `/projects/*` continuam no padrão antigo (conteúdo GL fixo) — funcionam, mas não foram redesenhadas.
- `pages/[...all].vue` (404) mantém o texto antigo.
