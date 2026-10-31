# CLONE_PLAN.md — execução do clone de jesperlandberg.com (homepage)

Fonte única de verdade: `CLONE_SPEC.md`. Sempre que um valor lá estiver `[NÃO DETERMINADO]`, escolhe-se default documentado em `PROGRESS.md` (assunções), nunca inventado silenciosamente.

## 1. Stack recomendada (e por quê)

| Escolha | Valor | Justificativa |
|---|---|---|
| Framework | **Nuxt 4** (SSR) | mesma stack do original; replicar hidratação `/__nuxt` e teleports香的; descentraliza rotas |

3D/anim: **three@0.185.0** (REVISION idêntico) + **gsap@^3.13** (o original bundla GSAP; versão exata `[NÃO DETERMINADO]` → pin 3.13 estável). CSS: **Tailwind v4** via `@tailwindcss/vite` — mesmo gerador de classes observado no HTML compilado. Fonte substituta: **Inter Variable** (`@fontsource-variable/inter`, self-host) — ABC Diatype é paga. Assets: **placeholders SVG** com as dimensões/proporções exatas da SPEC (a SPEC proíbe copiar assets da página).

## 2. Estrutura de pastas

```
Portfólio/
├ CLONE_SPEC.md / CLONE_PLAN.md / PROGRESS.md
├ nuxt.config.ts        ← config + SEO/meta + vite plugins
├ package.json
├ server/api/subscribe.post.ts
├ public/placeholders/{card-*.svg, faces.svg, share.svg}
├ public/llms.txt
└ app/
   ├ app.vue            ← árvore fixa: .gl (canvas) + main (sr-only + páginas) + shields + chrome + loader
   ├ assets/css/main.css ← @theme tokens exatos (breakpoint s=650, spacing 0.1rem, escala text-N)
   ├ pages/index.vue    ← carrossel Featured (homepage alvo)
   ├ pages/full.vue / pages/newsletter.vue (estruturais, fidelidade melhor-esforço)
   ├ data/projects.ts   ← mock baseado nos dados SSR (textos verbatim + ratios + slugs)
   ├ composables/useGl.ts  ← engine: registro de planos, clock, scroll/drag, túnel, reveals
   └ components/{GlCanvas.vue, SiteChrome.vue, ProfilePanel.vue, NewsletterForm.vue, BootLoader.vue, GlText.vue, GlCard.vue}
```

## 3. Dependências (comandos exatos)

`npm install` único:
```
npm i nuxt@^4 vue@latest vue-router@latest three@0.185.0 gsap@^3.13.0 @tailwindcss/vite@^4 tailwindcss@^4 @fontsource-variable/inter@^5
npm i -D typescript@^5
```

## 4. Ordem de implementação

| # | Etapa | Objetivo | Ficheiros | Critério de conclusão verificável |
|---|---|---|---|---|
| 1 | Scaffold | projeto npm+ nuxt 4 + tailwind 4 instaláveis e `nuxt dev` sobe | package.json, nuxt.config.ts, app/app.vue mínimo, main.css vazio | `npm run dev` → 200 em :3000, console limpo |
| 2 | Tokens | `@theme` com valores exatos da SPEC (s:650px, spacing .1rem, text-*, radius, easings, Inter) | main.css, app.vue (import de fontes) | devtools: computed 1rem na 1500px = 10px; body 1.4rem Inter |
| 3 | Layout base | body fixed/hidden; .gl; chrome (header+footer) + sr-only verbatim | app.vue, SiteChrome.vue | DOM difere do original só em classes utilitárias equivalentes |
| 4 | Mock de dados | projects.ts (8 cards verbatim + ratios) + `/api/subscribe` (latência+validação+honeypot) | data/projects.ts, server/api/subscribe.post.ts | POST /api/subscribe responde 200/422 conforme |
| 5 | Cards DOM | article w/ data-id+data-gl, títulos/pill e radius exatos; mobile empilhado + desktop s: layout | pages/index.vue | aspect-ratio inline idênticos; 43.5svh/max-55rem |
| 6 | GL engine núcleo | renderer r185 full-viewport, ortho pixel-space, planos por rect (follow 1 clock), resize | composables/useGl.ts, GlCanvas.vue | planos desenhados atrás do DOM, cor/texto brancos corretos |
| 7 | Texto GL | planos de texto: CanvasTexture do rendered glyph string equivalente, reveal por linha (máscara+stagger), slot-machine dígitos no contador | GlText.vue, useGl | textos brancos idênticos, reveal ~0.6s em cascata; dígitos rolam |
| 8 | Cards no GL | plano por card: textura placeholder, máscara rounded-rect (15/20rem), sombra? (não há sombra) + mask pill arrow | useGl, assets | card visual = placeholder no rect 1:1 cantos corretos |
| 9 | Carrossel | wheel/drag/touch (Progress 1D GSAP), túnel edges (uniforms u_tunnelR/Y/P + u_fadeAng), snapping center | useGl, index.vue | drag contínuo suave; borda dobra em arco; [sem snap original? [PROGRESSO] assumido smooth + paras vídeo da SPEC] |
| 10 | Painéis + boot | Profile/Newsletter toggles (aria-expanded, inert off, fade .3s), boot loader 3 barras + fade z-99 | SiteChrome.vue, panels, BootLoader.vue | painel abre/fecha; loader some sem erro |
| 11 | Rotas /full, /newsletter, llms.txt | páginas estruturais + static llms.txt | pages/*, public/llms.txt | links do footer navegam sem 404 |
| 12 | Responsivo + a11y | s: breakpoints <650px, hover vs touch (fontsizes/input), teclado: focus natural n/a custom, headings/ARIA verbatim | componentes | screenshot 390px sem corte; sr-only content idêntico |
| 13 | Verificação | dev clean (sem warnings), imagens lado a lado (viewport 921×948 + mobile 390) via browser helper | — | checklist §6 resultar em zero diffs não-documentados |

## 5. Riscos e partes difíceis

1. **Pipeline GL de texto (SDF por glifo + slot-machine original)** — o shader com `aPitch/aCut/aMid` é authored à mostra; implemento equivalência: planos de texto via CanvasTexture + shader plane com máscara por linha; dígitos do contador animados por troca de glyph no canvas. [Fidelidade: média-alta; os efeitos permanecem "mesmo clock" e reveal-line]
2. **Túnel dos extremos do carrossel** — uni-fórmulas exatas desconhecidas; replicate: raio cresce fora do primeiro/último card (matches u_tunnelR/Y/P doc strings do shader). Ajuste visual por comparação de screenshots.
3. **Inter ≠ ABC Diatype** — métrica de descendo/leading ligeiramente diferente ⇒ 1-2px de shift aceitável e documentado; leading/semitrailings copiados da SPEC.
4. **Assets de imagem originais (retratos/serviços)** — sem licença; placeholders SVG flat com ratio correto e cor derivada.
5. **DatoCMS/meta** — dado token público está na SPEC; o clone **não** consulta DatoCMS (mock local), evitando chamar a API de produção.
6. **/projects/* fora do escopo do clone** — deixam href reais; rotas inexistentem 404 no clone (limitação documentada). /llms.txt em conteúdo resumido (original não capturado).
7. **MG Performance**: 8 texturas + canvas textos redimensionáveis; throttle draw em 120fps cap (GSAP ticker), DPR cap 2.

## 6. Checklist final de fidelidade (home 1:1)

- Estrutura DOM: sr-only idêntico + todos os data-id/data-gl/gl assinatures
- Tipografia: familia equivalente; text-* e espaçamentos exatos; `-webkit-text-fill-color:transparent` nos paints GL
- Cores: só #000/#fff + opacities dimensionadas; dourado apenas se evidenciado visualmente
- Carrossel: 8 cards com ratios exatos; drag/wheel; bordas em arco
- Painéis: Profile (textos verbatim BSSM) e Newsletter (form idêntica + status live)
- Boot: loader 3 barras + fade
- Nav: hover opacities + durações exatas; router active states
- Responsive 650px: layout coluna empilhada
- Console: zero erros/warnings (exceto logs originais [CAR]/[COL] equivalentes)
- A11y: h1/h2 + listas sr-only verbatim; form labels; aria-expanded bindings
