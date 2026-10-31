# CLONE_PLAN.md — clone de forgeautomotive.co.uk (homepage)

Base factual: `CLONE_SPEC.md`. Tudo o que lá está `[NÃO DETERMINADO]` é tratado aqui como decisão de engenharia, não como facto do original — cada uma está marcada com ⚠ e justificada.

---

## 1. Stack recomendada

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

## 2. Estrutura de pastas

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

## 3. Dependências

```bash
# base (versão do original)
npx create-next-app@16.3.5 forge-clone --ts --app --eslint --src-dir=false --import-alias "@/*"

cd forge-clone
npm i styled-components lenis@1.3.26 gsap @gsap/react
npm i @sanity/client next-sanity @sanity/image-url
npm i -D @types/styled-components eslint-plugin-react-hooks
```

Sem Tailwind (o original não usa). Sem `three` (o canvas é shader próprio; §7.4).

---

## 4. Ordem de implementação

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

## 5. Conteúdo e dados

- Schema Sanity mínimo: `relic`/`step` (`title`, `body`, `media { image, alt }`, `index`, `total`), `brand` (`name`, `logo`), `section` (`eyebrow`, `heading`, `body`, `cta { label, href }`), `siteSettings` (menu, socials, footer, cookie copy).
- Imagens via `@sanity/image-url` com `auto=format&fit=max&w=` (igual ao original: 390/640/3840).
- Enquanto o CMS não existe, `lib/content.mock.ts` com o texto de §7.1 do spec (é conteúdo real do site, útil para validar layout).

---

## 6. Riscos e como contornar

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

## 7. Decisões técnicas para o que o spec não fecha

1. **Reveal de texto**: `SplitText` por linhas (`type:"lines"`), `y:110%` → `0`, `duration:.9`, `ease:"expo.out"`, `stagger:.06`, disparado no `load` do hero e em `ScrollTrigger` (`start:"top 80%"`) nas restantes. ⚠ valores a calibrar.
2. **Troca de passos**: um `ScrollTrigger` por painel (`start:"top top"`, `end:"bottom bottom"`, `scrub:true`) que publica `progress` num store; o componente escolhe `index = clamp(floor(progress * n))` e anima z-index/opacity das camadas. ⚠ o original pode usar tween contínuo em vez de degraus discretos.
3. **Progresso**: `scaleX(0.0005 + p * 0.9995)` — o original arranca em `0.0005` (nunca 0) para evitar divisão por zero em transições.
4. **Canvas do rodapé**: começar com um shader de ruído/gradiente lento (1 plano, `gl_FragColor` com `snoise`), apenas se sobrar tempo; caso contrário, omitir e anotar no checklist.
5. **Menu**: overlay full-screen com `nav[aria-label="Menu"]`; o original não expõe `role="dialog"`, portanto replicar como `<nav>` + `aria-expanded` (não inventar diálogo).

---

## 8. Checklist de fidelidade

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
