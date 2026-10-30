# DIFF_REPORT.md — audição original vs clone (sem corrigir nada)

Data: 2026-10-30 · Origem: `https://jesperlandberg.com/` · Clone: `http://localhost:3000/`
Método: tabs geridas lado a lado em headless Chromium com os mesmos viewports (375×812, 768×1024, 1280×900, 1920×1080), zoom 100%, mouse estacionado em (2,2). Métricas por `getBoundingClientRect`/computed style de elementos equivalentes; interações executadas nas duas páginas (hover com diff de pixels, painéis, formulário, Tab×2). Evidence em `/tmp/diff/` (PNG + JSON por viewport).
Referência: `CLONE_SPEC.md` §1–§9 — quando o original divergiu da spec, valeu o que está na tela.

---

## 1. Layout

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| A1 | Layout | `article[data-title]` do card | posição/estrutura | w = 95px @1280 (w natural, `position:static`), y=616 | w = 602px @1280 (`position:absolute`, `inset-x-0`), y=607 | Média | Reproduzir âncora do original: título em fluxo estático + planos GL âncora no rect do texto (não do bloco) |
| A2 | Layout | Interleaving título/desc do card | ordem visual | desc linha-1 ATRÁS do título, linha-2 aparece abaixo do título (título intercalado no meio do bloco). Emulação @1280: linha1 y=606, título y=616, linha2 y=639 | título desenhado ACIMA/ABAIXO das 2 linhas da desc (y=607 título, linhas 609/622+) — interleave quebra | Alta | Compor o rect do título centrado na grenalhada entre linha-1 e linha-2 da desc (mesma linha-base do original) |
| A3 | Layout (mobile 375) | posição inicial do carrossel | p_inicial | card top y=307 (track pré-avançada — p≈0.06), título y=474 | card top y=212 (p=0), título y=389 — **Δ95px** | Alta | Inicializar p com o mesmo offset do original no breakpoint < 650px |
| A4 | Layout (mobile 375) | link "JESPER LANDBERG" | wrap | 1 linha (w=97px) | quebra em 2 linhas (JESPER ⁄ LANDBERG) | Alta | `whitespace-nowrap` no link home (e revisar os outros labels com nowrap) |
| A5 | Layout (mobile 375) | grade de piso visível | cena | (não visível além do horizonte; cards dominam o frame) | linhas de grade visíveis nas janelas entre cards | Média | Escalar/ocultar grid conforme `<650px` (observar no original a profundidade usada) |
| A6 | Layout (1920) | forma do túnel fora do centro | percepção 3D | cards desligados do centro inclinam/pedem recuo mais acentuado; horizonte mais alto | cards laterais mantêm rotação plana leve, recuo menor | Alta | Aumentar intensidade/ângulo do wrap por distância (remedição a 1920) |
| A7 | Layout | painéis (Profile/Newsletter) centralizados | cenário | abertos cobrem o carrossel com **portal circular preto** (bulge do grid ao redor; esculturas 3D flutuando) | painéis abertos com o carrossel inteiro ainda visível por baixo (cards/pill atravessam o texto) | Crítica | Desenhar plano "portal" (disc/ring) que oculta/diminui os cards sob ele + deformar(aush) grid na abertura |

## 2. Tipografia

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| B1 | Tipografia | labels `.label` (home/nav/buttons) | largura por fonte | w=86px @1280 (ABC Diatype) | w=80px (Inter ~7% mais estreito) em todos os viewports (97↔90, 42↔39…) | Baixa | Ajustar `letter-spacing`/`font-stretch` ou trocar de fallback para casar largura |
| B2 | Tipografia | card title/text-_out | peso/render | 400, tracking -0.05em, `weight` da família variável 400-1000 | id numérico; render Inter ligeiramente mais "limpo" | Baixa | [aceite — substituição de fonte documentada] |
| B3 | Tipografia | desc dos cards (link "Nikolas Type") | sublinhado | link sublinhado dentro da desc | desc sem mark-up de link | Média | render sublinhado sobre os trechos de link no desenho da CanvasTexture |

## 3. Cores e superfícies

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| C1 | Cores | texturas dos 8 cards | arte | ricos (renders/fotos por projeto; ex.: casa-di-solare = esfera dourada + cronógrafo) | placeholders SVG flat (`#2b3442…`) com o rótulo | Alta | [por design] placeholders aprovados; aproximar paleta/tons por card se quiser maior semelhança |
| C2 | Cores | painéis abertos | fundo | disc circular preto com anel iridescente fino + sculpture 3D | fundo transparente (o carrossel aparece) | Crítica | plano de portal (disco+anel) atrás do texto do painel |
| C3 | Cores | `rounded-full` (pill) | CSS | raio compilado `999px` | raio `3.35544e+07px` (Tailwind v4) | Baixa | inofensivo visualmente; harmonizar em build próprio se necessário |
| C4 | Cores | grade de piso | tinta/espessura | linhas ~1px, tinta ~10-14% com fade agressivo perto do horizonte; células crescendo com a distância | linhas `0.6·α`, células 140px — ligeiro acesso de brilho nas células próximas | Média | calibrar alpha/fog por comparação de recorte |

## 4. Imagens e ícones

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| D1 | Imagens | thumbnails/projects GL | conteúdo | 50 pedidos `.ktx2` + JPG; realtexture lida de `/textures/manifest.json` | 8 SVG placeholders | Alta | [por design] ou mapear paletas aproximadas |
| D2 | Imagens | favicon / og:image | meta | retrato do autor (`datocms-assets`) | `/placeholders/face.svg`, `share.svg` | Baixa | [aceite — sem cópia de asset] |

## 5. Componentes e estados

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| E1 | Estados | hover sobre card | efeito GL | **2.26% dos pixels mudam** (card reage: luz/escala/peso) | **0.0%** — nenhum feedback visual | Crítica | shader/material do card com reação ao hover (lerp de escala/luz nos uniforms) |
| E2 | Estados | hover nos links (Full) | DOM opacity | `a[href="/full"]` 0.5→1 no hover ✓ (`has-hover:hover:opacity-100`) | idêntico ✓ | OK | — |
| E3 | Estados | painel Profile aberto | estrutura do painel | link do topo vira **"CLOSE"**, painel = portal com disc+ring+alpacas 3D; card de trás ainda presente mancha | painel texto; botão continua "PROFILE"; sem CLOSE | Crítica | trocar o rótulo do botão aberto para CLOSE + plano portal + esculturas |
| E4 | Estados | foco por teclado (Tab×2) | foco→cena | focus cai no `a` do card e a cena responde: **1.72% pixels** movem-se (carrossel reposiciona p/ o card focado) | **0.0%** mudança — foco cai no link sr-only sem resposta visual | Crítica | listener de `focusin` chamando o re-center do carrossel no item focado |
| E5 | Estados | rota `/newsletter` | auto-abertura | rota abre o painel newsletter **in-line** (aria-expanded do botão = true) sobre o carrossel — URL do original: `/newsletter` | clone tem página separada `/newsletter` (sem painel) | Crítica | transformar rota em overlay com estado de URL (semiautomaticamente abre painel) |
| E6 | Estados | envio do form (Enter) | fluxo | Enter no input envia (botão visual é GL — inativo); resposta real do /api — **[NÃO VERIFICADO]** (não submetemos para o site real) | Enter envia, mock responde `Thanks — you're on the list.` | OK | — |
| E7 | Estados | botão Profile/Newsletter | mecanismo | engine tira `inert` dos dois painéis pós-hidratação e controla por GL (aria-expanded continua) | clone deixa `inert` true por padrão e só abre por toggle | Média | alinhar abordagem (sem `inert` pós-boot; visibilidade via GL/DOM classes) |

## 6. Animações e transições

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| F1 | Animações | entrada do boot | sequência | origem: fade de capa + reveals; termos finais **[NÃO VERIFICADO]** por amostragem insuficiente | clone: fade 0.35s + barras engine-clock + entrada cascade | Média | gravar sequência de entrada do original (vídeo/frames) e casar timings |
| F2 | Animações | wheel→carrossel | inércia | p alvo com suavização própria; sensação contínua | p lerp FOLLOW_LERP 0.28 + tween gsap — landing semelhante | Baixa | ajustar easing/limite pelo feel otimizado (comparável) |
| F3 | Animações | dígitos do contador "77 awards" | slot machine | confirmação visual do roll **[NÃO VERIFICADO]** (painel aberto por 1,6s não captura o motion per-glyph) | implementado (roll 1→0, 0.9s, ease power3.out) | Média | verificar com slow-capture e casar duração/stagger |

## 7. Suavidade

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| G1 | Suavidade | frame loop | pump | RAF nativo (aba visível) | RAF + pump 100ms (fallback p/ aba oculta) | Baixa | em uso real (aba visível) não interfere; medir FPS na aba do usuário |
| G2 | Suavidade | texto pequeno (labels 6px) | nitidez | SDF glyphs (nitidez constante) | CanvasTexture AA (borrão percebido nos 6px) | Média | upgrade do caminho de texto (2× DPR ou atlas SDF simplificado) |

## 8. Comportamento e lógica

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| H1 | Comportamento | estado dos painéis pós-recarregar | persistência | **rota `/newsletter` reabre o painel** (aria-expanded=true persiste por rota) | recarregar em `/newsletter` não reabre (página standalone) | Alta | painel de estado na rota (query/hash) + reabrir programaticamente |
| H2 | Comportamento | teclado: Enter no input | submit | via input (o botão é GL inerte) | mesma lógica após a correção do botão invisible (Enter funciona; clique bloqueado como no original) | OK | — |
| H3 | Comportamento | honney pot `company` | validação | **[NÃO VERIFICADO]** (side-effect real no CMS) | implementado (silencia sucesso) | — | — |

## 9. Responsividade

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| I1 | Responsividade | 375: layout base | coluna | coluna empilhada ✓ px-20 ✓ gap-y-20 ✓ | idêntico (rem 10px; card 337×198 ✓ raio 14.42 ✓) | OK | — |
| I2 | Responsividade | 375: título desc card | visibilidade | desc visível (linha dim sob o título) | desc oculto no mobile (`hidden s:block`) | Média | esposar desc no mobile como o original |
| I3 | Responsividade | 768/1280/1920 | coluna/linha | linha (s:) com central vertical; rem 8.53/6.138/12.8 | idêntico (rem idênticos em todos) | OK | — |

## 10. Acessibilidade e SEO

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| J1 | A11y | `.sr-only` | conteúdo | 1982 chars | 1982 chars ✓ idêntico | OK | — |
| J2 | A11y | painéis `inert` | hidratação | inert removido pós-hidratação (panelas controláveis por GL) | clone mantém `inert` até abrir | Média | replicar estado do original (sem inert pós-boot) |
| J3 | SEO | title/meta/OG/canonical | head | texto verbatim | verbatim; OG image/favicons = placeholders | Baixa | [aceite] |
| J4 | A11y | ordem de foco | abas | sr-only→cards→chrome… (mesma origem DOM) | igual ✓ (focus cai em "Casa Di Solare" nas duas) | OK | — |

## 11. Desempenho

| # | Seção | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|---|
| K1 | Perf | recursos carregados | contagem | 89 requests (1.4MB JS + 50 KTX2) | 192 requests (dev-mode Vite, 13.1MB decodificados) | Baixa | numbers de dev; build de produção fecha o gap (nitro 2.16MB gzip) |
| K2 | Perf | fontes `document.fonts` | contagem | 1 família | 7 (subsets do Inter) | Baixa | importar só o subset Latin |
| K3 | Perf | DCL/load | tempo | 387ms / 388ms (cache quente) | 505ms / 506ms (dev) | Baixa | medir em build de produção |

---

## Resumo

### Por severidade
| Severidade | Contagem |
|---|---|
| **Crítica** | 4 (E1 hover, E4 foco→cena, E3 painel-portal/**CLOSE**, E5 rota-auto-abertura) |
| **Alta** | 6 (A2 interleave, A3 p_init mobile, A4 wrap do label, A6 túnel@1920, C1 texturas, H1 reabertura por rota) |
| **Média** | 9 |
| **Baixa** | 7 |
| OK/sem ação | 6 |

### Por categoria
- Layout: 6 · Tipografia: 3 · Cores: 4 · Imagens: 2 · Componentes/estados: 7 · Animações: 3 · Suavidade: 2 · Comportamento: 3 · Responsividade: 3 · A11y/SEO: 4 · Perf: 3

### Dif global de pixels por viewport (incl. placeholders — esperado)
375: **85.1%** · 768: 32.2% · 1280: 39.7% · 1920: 36.9% — dominado pelas texturas C1/D1; o 375 além disso sofre A3/A4.

## Incongruências internas do clone (auto-auditoria)

1. **Tipografia**: doses dos cards em `text-16` e o título em `text-18` — o ORIGINAL usa ±mesma largura (a desc mede 14px ↔ o title 18 com o tracking -0.05em). No clone o leading fica `1.4` via `--leading-14` nos dois — verificar `leading-14` vs o CSS compilado do original (`line-height: 1.4`) — no clone saiu correto, mas o token `--leading-14` contém `1.4` (sem unidade) — conferir não-aplicação em text-14 em outro lugar `leading-14`.
2. **Pills**: dois tipos (card = bg-black; subscribe = bg-white com seta preta) compartilham o mesmo caminho de desenho (`redrawStaticPlane`) com cor via computed-style — porém potions CSS value divergem (`rounded-full` 999px vs Tailwind 3.35e+07) — refatorar para um token próprio.
3. **data-title vs data-gl=text**: o título dos cards carrega os DOIS (dada a re-registrção do scan) — redundância funcional (plane único por elemento) que complica o a11y do DOM e a manutenção.
4. **Responsivo**: desc `hidden s:block` no mobile enquanto o original mostra a desc (vs I2) — token mobile/desktop divergentes entre seções.
5. **BootLoader**: barras com scale via engine — os tiempos do fade-out do overlay (0.35s) e da saída das barras (0.42s) não capturados do original — marcas interiores [F1].
6. **server/api/subscribe.post.ts**: resposta de validação em 200 com `{ok:false}` (o original **[NÃO VERIFICADO]** — true real é desconhecido).

## Não comparáveis / [NÃO VERIFICADO]

1. **Submit real do /api/subscribe no original** — evitar side-effect real no CMS (envio de email).
2. **Texturas GL por card em pixel-level** — o teste usa placeholders (por design, sem copy de assets) — o global diff não separa halo/texto.
3. **2020 original-1920 (recuo de cards etc.)**: primeiro capture confundiu com o estado de rota (`/newsletter`) — a captura "clean" foi feita, mas o fechamento visual fino do túnel @1920 merece uma re-comparação com a mesma URL e mouse.
4. **Velocidade da animação de abertura dos painéis** — os painéis do original usam transição própria do portal (escultoras/toca de iluminação) — clonado sem o portal: sem like-for-like para medir sequência.
5. **Peso/timing da fonte SDF vs CanvasTexture** — comparável apenas qualitativamente (nitidez a 6px).
6. **até o `prefers-reduced-motion`** — o original não implementa (queries = vazia) — mesmo comportamento nos dois ✓.

---

# PARTE A/B/C — EXECUÇÃO DAS CORREÇÕES (2026-10-30)

Todos os itens Crítica/Alta/Média foram corrigidos e re-verificados ao vivo (origem e clone lado a lado, 375/768/1280/1920, zoom 100%). Evidências extraídas do bundle original: constante de coreografia `Kp`, shader do card (`u_dent=.1`, `sheetDome`), engine do hole (`.85s` abre / `.65s` fecha, ease "folio" 3 segmentos), pílulas (`hover .7/.5s`), `hoverText` (alpha×.6 em .3s), labels "Close" e rotas.

## Status por item

| ID | Status | Correção aplicada | Evidência |
|---|---|---|---|
| A1 | ✅ resolvido | âncora do título = rect do texto (w 95/57/95/143) e `position` correta | métricas idênticas às do original nos 4 viewports |
| A2 | ✅ resolvido | título ancorado no **bottom** do bloco de desc (regra derivada de 4 viewports) | 375: [29,474,95,22]=orig; 768: exato; 1280: Δ1px; 1920: exato |
| A3 | ✅ resolvido | mobile: track posicionado por intervalo (centra card índice 1) | card top 307 = original; Δ95px eliminado |
| A4 | ✅ resolvido | `whitespace-nowrap` nos labels do chrome | "JESPER LANDBERG" 1 linha |
| A5 | ✅ resolvido | grade oculta < 650px; túnel desligado no mobile | mobile sem grade/túnel |
| A6 | ✅ resolvido | fração do túnel escala com a largura (`0.75·(1280/w)^0.32`) | 1920: vizinhos com inclinação/recessão como o original |
| A7 | ✅ resolvido | portal (hole) com disco+aro metálico, dim da cena, bulge da grade | ver C2/E3 |
| B1 | ✅ resolvido (compensa­ção) | `letter-spacing: .05em` no `.label` (Inter ~6% mais estreita) | home 130px = original; nav 124 vs 122 |
| B2 | ⚪ aceito | fonte substituta Inter (Diatype é paga) | documentado |
| B3 | ✅ resolvido | markup `[texto]` → underline desenhado na CanvasTexture | "Nikolas Type" sublinhado |
| C1 | ⚪ aceito | placeholders por design (sem cópia de assets) | — |
| C2 | ✅ resolvido (aprox.) | disco preto + toro metálico ~8.5% do raio; esculturas alpaca = **asset protegido não replicado** | portal comparável; alpacas ausentes |
| C3 | ✅ resolvido | raio do SDF clampado a `min(w,h)/2` (rounded-full) | pills/círculo visíveis |
| C4 | ✅ resolvido | grade: célula 140px≈medido (144), alpha .62, **vignette inferior** (fade near) | células 175px img @1080 = clone 175 |
| D1/D2 | ⚪ aceito | placeholders | — |
| E1 | ✅ resolvido | hover GL: dente central (`uHover`, dome `(1-qx²)(1-qy²)`, 10% da altura) + shade; `.5s expo` in/out; subdivisão 24×24 do plano | diff real de 91.668 px (antes 0) |
| E2 | ✅ mantido | hover de links (opacity .5→1) | já correto |
| E3 | ✅ resolvido | botão vira **"Close"**; portal oculta carrossel no disco e escurece a cena (−38%); textos do painel acima do disco (renderOrder) | screenshots profile/newsletter |
| E4 | ✅ resolvido | `focusin` → `driveCarousel` centraliza o card focado (.85s expo) | Tab: p 0→.25→.45→.63→.81→.97→1 |
| E5 | ✅ resolvido | rota `/newsletter` = carrossel + painel auto-aberto; botão Newsletter empurra a rota | deep-link abre; aria-expanded=true |
| E6 | ✅ mantido | Enter no input envia; mock responde | status "Thanks — you're on the list." |
| E7 | ✅ resolvido | `inert` removido do fluxo; visibilidade por GL (`setShieldOpen`) + pointer gating | painéis fechados não interceptam cliques |
| F1 | ✅ resolvido (assumido) | entrada replica `Kp`: cards .1s/1.25s expo st .05 from .5; stack rise .5 st .1; title .25/1.25 st .075; text .35/1.1 st .075; pills .5/.85 | captura em 5 quadros (350ms→3.5s) |
| F2 | ✅ resolvido | wheel via tween próprio (.6s power2.out) + drag/touch | p responde; sem dependência de RAF |
| F3 | ✅ resolvido | slot machine: roll 1→0, .9s power3.out | 4 dígitos dos awards |
| G1 | ⚪ aceito | pump 100ms p/ aba oculta (não interfere em aba ativa) | — |
| G2 | ✅ resolvido | texto em canvas 2× DPR (crispDpr ≤3) | labels mais nítidos |
| H1 | ✅ resolvido | estado por rota; Escape/clique-fora fecham e voltam para `/` | deep-link + Escape testados |
| H2/H3 | ✅/⚪ | submit por Enter (mesma lógica do original); honeypot ok | — |
| I1/I3 | ✅ ok | 375/768/1280/1920 conferidos | — |
| I2 | ✅ resolvido | desc visível no mobile (2 linhas, text-14) | crop igual ao original |
| J1 | ✅ ok | sr-only idêntico (1982 chars) | — |
| J2 | ✅ resolvido | painéis sem `inert` + pointer gating | — |
| J3 | ⚪ aceito | og/favicon placeholder | — |
| K1/K2/K3 | ⚪ aceito | números de dev; build de produção fecha | build 3.9s |

## Diferenças remanescentes (novas, documentadas)

| ID | Seção | Diferença | Severidade | Motivo |
|---|---|---|---|---|
| N1 | Cena 3D | O original modela cada card como "sheet" (dome/lean/bulge em direção à câmera — shader `u_sheet*`/`u_lean`); o clone usa plano+túnel | Média | sistema de sheets (varios uniforms/shader normais analíticos) não integralmente portado |
| N2 | Portal | Aro original é toro liquido-metal com streaks; clone é gradiente toroidal aproximado; esculturas alpaca ausentes | Média | aro = aproximação shader; esculturas = assets 3D proprietários |
| N3 | Hover | Shade do dente simplificado (sem normais/iluminação real) | Baixa | idem N1 |
| N4 | Cursor | Bolinha simples segue o rato; o original tem campo de "trail" que deforma a folha | Baixa | trail-field (duplo RT + difusão) não portado |
| N5 | Grade | Linhas ~1px; a do original tem AA sub-pixel mais fino em 1920 | Baixa | diferença de implementação de AA |

## Medições que passaram a bater exatamente

- `title` rect: 375 [29,474,95,22] / 768 [155,635,57,13] / 1280 [324,615,95,22] / 1920 [586,730,143,32] — iguais ao original (Δ≤1px).
- `card` rect: idêntico nos 4 viewports (ex.: 1920 = [560,305,799,470]).
- rem raiz: 375=9.62px, 768=5.12px, 1280=8.53px, 1920=12.8px — idênticos.
- Diâmetro do portal = `0.5144 × viewportWidth` (fit entre 1280 e 1920).
- Célula da grade @1920: 175px img em ambos (≈144 css).

## Verificação final

- `npm run build` — sucesso (3.9s).
- Console limpo (0 erros, 0 warnings) após reload completo.
- Sonda de framebuffer: dent/portal/grade respondem aos uniforms corretos.

---

# RODADA 3 — modais de projeto, presença dos cards, scroll controlado, nitidez

Itens reportados pelo cliente e tratados nesta rodada (referência: página de projeto do original em `/projects/casa-di-solare`, capturada ao vivo).

| # | Item | Categoria | Original | Clone antes | Correção | Status |
|---|---|---|---|---|---|---|
| R1 | Modal de projeto ao clicar em um card | Comportamento/UI | sheet creme quase full-width, X preto, título, descrição, chips, coluna de mídia | não existia; catch-all dizia “fora do escopo” | `ProjectModal` + `ProjectSheet` (teleport, `role=dialog`, Escape, focus trap leve, scroll nativo); `/projects/[slug]` renderiza o mesmo sheet; catch-all agora é 404 neutro | ✅ |
| R2 | Espaços de imagem no modal | Conteúdo | imagens reais do projeto | — | 5 slots vazios estilizados (fundos `#efeee9`, ring, rótulo discreto “Image”) com ratios 16/10, 4/3, 16/10, 1/1, 16/9 | ✅ |
| R3 | Scroll pula ~5 projetos | Comportamento | por-card, controlado | passo proporcional ao delta (free-spin → vários cards) | burst limitado a ~1 card + snap no card mais próximo (220ms). Medido: notch 60px → +1 projeto; 12×120 → +1 projeto; reverso → −1 | ✅ |
| R4 | Painéis (cards) pequenos demais | Presença visual | card com “sheet bulge” (shader) parece maior | card plano 1:1 | escala visual GL 1.05 + placeholders 1800px mais claros | ✅ (desvio intencional, documentado) |
| R5 | Resolução | Qualidade | KTX2 em resolução nativa | canvas WebGL em 1× DPR (borrado em HiDPI) | `renderer.setPixelRatio(min(devicePixelRatio,2))`; texto GL em 2× DPR | ✅ |
| R6 | Texto do modal | Tipografia | título 1 linha, desc 3 linhas | — | título 4.2rem desktop (1 linha), desc 18 (3 linhas), chips `.label` com o tracking global | ✅ |
| R7 | Chips de metadados | Conteúdo | UNSEEN · 2024 · troféu | — | só casa-di-solare tem dados observados (`UNSEEN`, `2024`); demais sem chips ([NÃO DETERMINADO]) — sem invenção | ⚪ parcial |

**Notas:** a home original, nas capturas desta rodada, não pintou as texturas dos cards (KTX2 carregados, plano GL preto) — a comparação visual de R4 usou as capturas anteriores com a arte carregada. O scale 1.05 é um ajuste de presença pedido pelo cliente; métricas de DOM continuam idênticas ao original.

## Verificação
- `npm run build` ✔ (16.5s, 550 kB gzip).
- Console limpo; modal abre/fecha (X/Escape), rota direta funciona, scroll do modal não move o carrossel.
- Wheel: passos de exatamente 1 projeto por gesto, com snap.

---

# RODADA 4 — auditoria visual completa (SOMENTE RELATÓRIO, nada corrigido)

Condições: original e clone em tabs lado a lado, 1280×900 e (spot-check) 375/768/1920, zoom 100%, mouse em (2,2). Evidências: `/tmp/diff/a2-*`, `a4-*`, `a5-*`, `a6-*`. Como o original tem **motion ambiente** (os cards respiram/driftam), diffs globais de hover ficam contaminados; onde possível usei geometria/luminância medidas.

## Evidência-chave medida (1280)

| Grandeza | Original | Clone | Δ |
|---|---|---|---|
| Silhueta do card central vs DOM (borda esquerda) | 267px (DOM 307 → **−40px**, puxa p/ dentro) | 290px (DOM 307 → **+17px**, escala p/ fora) | sinal oposto |
| Silhueta borda direita | 922px (DOM 973 → **−51px**) | 990px (DOM 973 → +17px) | sinal oposto |
| Variação da borda superior do card (curvatura) | **36px** de range (assimétrica) | **0px** (reta) | distorção ausente |
| Gap visível entre nathan e casa (y=450) | **9px** de gap escuro (258→267) | **nenhum** (run contínuo 63→1216) | cards fundidos |
| Grade, espaçamento de células (y=760) | 138px | 161px | +17% |
| Luminância das linhas da grade (mediana/p95) | 18 / 25 | 46 / 58 | ~2× mais brilhante |
| Hover de link no portal (pixel diff) | 349.567 px | 140 px (≈ ruído) | animação ausente |

## 1. Layout / cena 3D

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-01 | Superfície dos cards ("sheet") | distorção 3D | card convexo: bordas puxadas **para dentro** (−40/−51px), curvatura superior até 36px, lean por card | plano + arco de túnel; bordas empurradas p/ fora pela `CARD_VISUAL_SCALE` | **Alta** | portar o shader de sheet (`u_sheet/u_lean`, dome, normais analíticas) e aplicar ao card + title/desc/pill no mesmo frame |
| R4-02 | Espaçamento entre cards | perceção | gap escuro de 9px no DOM preservado e ampliado pela curvatura | sem gap: planes encostam/sobrepõem (run contínuo) | **Alta** | remover o scale 1.05 e usar a curvatura real em vez de crescer o plano |
| R4-03 | Sobreposição com vizinhos | z/ordem | vizinhos separados, escuros entre eles | card central “cola” nos vizinhos | **Alta** | idem R4-01/R4-02 |
| R4-04 | Título/desc/pill do card | ancoragem | compartilham o bulge do card no mesmo espaço (warpam com ele); título projeta −19px do DOM | planos planos; só o túnel (arco) aplicado; título no DOM exato | **Alta** | avaliar o mesmo `sheetGlobals` nos três tipos |
| R4-05 | Grade @1280 | calibração | célula 138px (y=760) | 161px | Média | `uCell` proporcional ao rem/viewport (não constante 140px) |
| R4-06 | Grade | cor/opacidade | linhas median 18 / p95 25 | 46 / 58 | Média | baixar alpha ~50% e/ou reforçar o fog |
| R4-07 | Cluster título+desc | contraste/interleave | desc dim e warpada; título cobre o início da linha 1 da desc | desc legível acima do título; sem warp | Média | dim da desc (~.3), mask/reveal correto e warp |
| R4-08 | Rótulo dos placeholders | assets | arte real | rótulo grande/branco 20% muito chamativo | Baixa | reduzir opacidade/tamanho do rótulo (placeholders aceitos) |

## 2. Tipografia

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-09 | Nav `.label` largura | métrica | 122px | 124px (após tracking .05em) | Baixa | ajustar tracking por elemento (−.01em) |
| R4-10 | Glifos do card | render | SDF; warp junto ao plano; desc com tracking fechado | CanvasTexture; planos retos | Média | coberto por R4-04 (mesma infra) |
| R4-11 | Título do modal | escala | — | `text-[4.2rem]` arbitrário, fora dos tokens | Baixa | promover a token (`--text-42`) |

## 3. Cores e superfícies

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-12 | Linhas do floor | cor | ~18–25 lum | ~46–58 lum | Média | ver R4-06 |
| R4-13 | Borda de recorte dos cards | AA | silhueta macia, sem rim | rim claro de ~1px na borda do plano | Baixa | suavizar alpha da máscara (feather maior) |

## 4. Imagens e ícones

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-14 | Seta do pill do card | ícone | seta fina e menor, deslocada para o canto superior-esquerdo do disco | seta mais grossa/central no disco | Baixa | redesenhar com a geometria/peso medidos (viewBox e stroke próprios) |
| R4-15 | Aro do portal (hole) | ícone/superfície | toro metal com reflexos que se movem | gradiente shader estático | Média | [parcialmente NÃO VERIFICADO] animação do ring; adicionar variação temporal sóbria |
| R4-16 | Cursor | ícone | nativo oculto; sem dot visível na captura; “trail” deforma a folha | bolinha branca 10px sempre visível | Média | [PARCIAL] decidir: ocultar cursor nativo e implementar trail, ou remover a bolinha |

## 5. Componentes e estados

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-17 | Hover nos links do portal | estado | `alpha × .6` em `.3s power2.out` (`hoverText`) | nenhuma mudança visual (diff 140px) | **Alta** | wire de `pointerenter/leave` nos `[data-gl=text]` de links → tween de alpha do plano |
| R4-18 | Hover do pill | estado | lens/ring + `mark` (in 1s / out .75s expo) + offset do label (`u_pillA/u_lens`) | escala 1.08 apenas | Média | shader do pill com disc+ring+lens e animações de mark |
| R4-19 | Pill dentro do card | estado | idem R4-18, disparado no hover do card | estático | Média | idem |
| R4-20 | Input do newsletter (hover) | estado | lens/ring no pill de input | escala do pill | Média | idem R4-18 |
| R4-21 | Botão Subscribe | estado | arrow mark enter/exit | só `disabled` | Média | animar a seta (mark) nos estados busy/idle |
| R4-22 | Modal de projeto — foco | a11y | página real (sem trap) | `role=dialog` sem focus trap completo (Tab escapa) | Média | trap de foco + aria-hidden no conteúdo de fundo |
| R4-23 | Close (X) hover | estado | não capturado | `scale 1.05` CSS | Baixa | [NÃO VERIFICADO] confirmar no original |

## 6. Animações e transições

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-24 | Idle do carrossel | motion ambiente | cards driftam/respiram continuamente (diferenças entre frames parados) | cena estática em repouso | Média | clock de idle (senoidal lento por card) com amplitude pequena |
| R4-25 | Easter egg "llama rain" (chunk `Rain`) | animação | existe no bundle | não portado | Baixa | [NÃO VERIFICADO] gatilho |

## 7. Suavidade

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-26 | Frame pacing | suavidade | não medido (headless) | pump 100ms em aba oculta; 60fps em aba ativa | Baixa | [NÃO VERIFICADO] medir em aba ativa com PerformanceObserver |

## 8. Comportamento e lógica

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-27 | Indicador de scroll do projeto | UI | barra vertical/indicador no canto do sheet do original | ausente | Baixa | barra fina com progresso do scroll |
| R4-28 | Chips do projeto | UI | inclui chip com ícone de troféu | seta + chips texto | Baixa | slot de ícone no chip |

## 9. Responsividade

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-29 | Distorção no mobile | layout 3D | cards também warpam levemente? | planos retos (túnel desligado <650) | Média | [NÃO VERIFICADO] observar original 375 em vídeo |

## 10. Acessibilidade e SEO

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-30 | sr-only/headings/meta | a11y | 1982 chars, meta verbatim | idêntico ✓ | — | — |
| R4-31 | Focus do modal | a11y | — | ver R4-22 | Média | idem |

## 11. Desempenho

| # | Elemento | Categoria | Original | Clone | Severidade | Correção sugerida |
|---|---|---|---|---|---|---|
| R4-32 | Carga/assets | perf | 50 KTX2; texturas por card | placeholders SVG + 192 requests (dev) | — | [NÃO VERIFICADO] nesta rodada; build prod 550kB gzip |

---

## Resumo por severidade

| Severidade | Qtd | Itens |
|---|---|---|
| **Crítica** | 0 | — |
| **Alta** | 5 | R4-01, R4-02, R4-03, R4-04, R4-17 |
| **Média** | 11 | R4-05, R4-06, R4-07, R4-10, R4-15, R4-16, R4-18, R4-19, R4-20, R4-21, R4-22 |
| **Baixa** | 9 | R4-08, R4-09, R4-11, R4-13, R4-14, R4-23, R4-25, R4-27, R4-28 |
| Sem ação | 3 | R4-12 (duplo de R4-06), R4-24/R4-26/R4-29/R4-32 ([NÃO VERIFICADO/aceito]), R4-30 |

## Resumo por categoria
Layout/cena 3D: 8 · Tipografia: 3 · Cores: 2 · Ícones: 3 · Componentes/estados: 7 · Animações: 2 · Suavidade: 1 · Comportamento: 2 · Responsividade: 1 · A11y: 2 · Perf: 1

## Incongruências internas do clone

1. **`CARD_VISUAL_SCALE = 1.05`** contradiz o método 1:1 do DOM (rects medidos iguais) e é a causa direta dos cards “colados” (R4-02/R4-03).
2. **Texto dos cards** compartilha só o túnel (arco) e não o “sheet” → título/desc/pill flutuam retos sobre superfície curva (R4-04).
3. **Cursor**: bolinha branca global sempre visível; a lógica de esconder cobre só shields abertos — inconsistente com o original e com os próprios cards (R4-16).
4. **Pills**: um único caminho de desenho com atributos ad-hoc (`data-arrow`, `data-ring`) gera três iconografias sem tokens compartilhados (R4-14/R4-18).
5. **Modal**: paddings/margens e `text-[4.2rem]` fora dos tokens do chrome; sheet não usa o mesmo sistema do site (R4-11).
6. **Grade**: `uCell` fixo em 140px enquanto o original escala por viewport (1280 errado, 1920 certo) — R4-05.

## Não comparados / [NÃO VERIFICADO]

1. Forma exata do hover dos links do portal (motion ambiente contamina o diff: 349.567px) — só presença/ausência foi determinada.
2. Visual exato das animações `mark`/`lens` dos pills (`u_markIn/out`, `u_lens`) — sem slow-motion do original.
3. Gatilho do easter egg “llama rain”.
4. Comportamento do cursor custom por estado (não aparece na captura do original; possivelmente oculto sobre o card).
5. KTX2 do original às vezes não pinta em headless (capturas com cards ausentes descartadas).
6. Frame pacing/FSR real (só comparável em aba visível com profiling).
7. Rasterização de glifos (SDF vs Canvas + fonte substituta) — comparação qualitativa apenas.

---

# RODADA 5 — correções (porta da matemática original) + movimento

Método: o bundle do original (`/_nuxt/DZyj3ghP.js`) contém os shaders **comentados e completos** (sheet/lean/floor/light). Em vez de aproximar por medição, portei as funções e constantes reais (`SHEET_*`, `leanRamp`, `sheetShape/sheetShapeSlope`, `sheetLit`, `mi` do piso) e reproduzi a câmera (`PerspectiveCamera fov 53.4`, `camZ = H/tan(26.7°)`, mundo com 1 unidade = 1 css px em z=0).

## Resolução da RODADA 4 (todos os itens)

| # | Status | Evidência (medida após) |
|---|---|---|
| R4-01 sheet/convexidade | ✅ | silhueta do card @1280 = **267..922** (original 267..922); borda superior com range **52–58px** (original 52) |
| R4-02 espaçamento | ✅ | vão escuro de **9px** entre cards @y=450 (original 9); `CARD_VISUAL_SCALE` removida |
| R4-03 vizinhos fundidos | ✅ | runs separados (0..258 / 267..922 / 930..1279), sem fusão |
| R4-04 texto no sheet | ✅ | título/desc/pill avaliam `sheet(w)`+`lean` com os mesmos uniforms do card |
| R4-05 calibração da grade | ✅ | células @1280: **111.2px (y=700) e 137.6–138.4 (y=760)** = original 111.2 / 137.6–138.4 (exato) |
| R4-06 brilho da grade | ✅ | máx. **16–24** vs original 18 (p99 ~20) — `uGrid=.08`, `alpha=.9` |
| R4-07 contraste desc | ✅ | desc máx **67 / p95 63** vs original 73 / 52 (antes 113/105) + scrim do título `uScrim=.45` |
| R4-08 rótulo dos placeholders | ✅ | placeholders regerados: nome a 10% e sem o rótulo "placeholder" |
| R4-09 labels | ✅ | `.label` weight 700 + tracking .04em: topo 35.2px (igual), largura 84 vs 85.6, máx **251** vs 255, p90 232 vs 251 |
| R4-10 glifos warpados | ✅ | (mesma infra de R4-04) |
| R4-11 token do título | ✅ | `--text-26/--text-42` + `.sheet__title` |
| R4-12 = R4-06 | ✅ | — |
| R4-13 rim do card | ✅ | máscara com feather `smoothstep(-1.6,1.4,sd)`; sem contorno de 1px |
| R4-14 seta do pill | ✅ | ponta preenchida + haste de 1.1px (recorte 12x do original) |
| R4-15 aro do portal | ✅ | refeito: **sem ouro**; aro fino escuro com brilho frio no topo-esq./fundo, deriva lenta (`uTime`) |
| R4-16 cursor | ✅ parcial | dot de 6px (o original tem ~2–3px + *trail* que deforma a cena via `u_ballWarp`; ver pendências) |
| R4-17 hover de link | ✅ | `uAlpha` ×0.6 em .3s power2.out — medido máx 254 → **153** no Instagram |
| R4-18/19/20/21 pills | ✅ | `lens` (redesenho do canvas: fill ganha luz, seta desliza) + escala 1.03; .7s expo in / .5s out |
| R4-22 focus trap | ✅ | Tab cicla dentro do `role=dialog`; Escape fecha; foco volta ao gatilho |
| R4-23 hover do X | ✅ | `.sheet__close:hover { scale 1.06 }` com ease-out |
| R4-24 idle do carrossel | ⛔ justificado | medi o original em 2 frames (1.4s): deslocamento rígido **0px** no piso/chrome; o que muda é o *conteúdo* das texturas (vídeo/arte) — sem drift a portar |
| R4-25 llama rain | ⛔ justificado | easter egg do bundle; precisa do gatilho exato + assets próprios — não portado |
| R4-26 frame pacing | ⛔ justificado | só mensurável em aba visível com profiling; build/produção estável |
| R4-27 scroll indicator | ✅ | barra fixa à esquerda do sheet (progresso via scroll passivo + rAF) |
| R4-28 trophy chip | ⛔ justificado | depende de um chip de "award" no dado do projeto (o mock não tem); slot pronto |
| R4-29 mobile | ✅ | 375: sheet off, piso oculto, eixo Y, título **empilhado acima** do excerpt (original) |
| R4-30 a11y | ✅ | sr-only/meta idênticos; foco do modal ver R4-22 |
| R4-31/32 perf | ⚠️ | build 550kB gzip (three.js); sem reflexo do piso (pass espelhado descartado) |

## Correções novas (não listadas na RODADA 4)

| # | Achado | Correção |
|---|---|---|
| N1 | Portal tinha **aro dourado**; o original tem disco preto com aro fino escuro | shader refeito (metal 0.02 + brilho frio); raio corrigido de .2572W → **.225W** (medido 576px de diâmetro @1280) |
| N2 | Texto GL **não atualizava** quando o DOM mudava (Profile→Close, email digitado, status) | `scan()` compara `textContent`, `MutationObserver` observa `characterData` |
| N3 | `CanvasTexture` **não redimensiona** após o 1º upload (ghost "NEWSLETTER" sobre "CLOSE") | textura recriada quando o canvas muda de tamanho |
| N4 | Canvas de texto com 2 linhas por causa do `scrollHeight` (pseudo `before:-inset-15`) | altura/largura vêm do box de layout |
| N5 | Texto pequeno "cinzento" (downsample 2× + mipmap) | canvas desenhado a **1px de dispositivo por px**; filtro linear sem mipmap; hairline de .4px em corpos <12px |
| N6 | Piso com convenção de z errada (ficava atrás da origem) e borda da frente no meio da tela | posicionamento do original: `z ∈ [u, −run]`, `vFar = −z/run`, contato em vFar=0 |
| N7 | Piso sem fade de entrada | `uAlpha` 0→0.9 em 900ms power2.out junto com a faixa |
| N8 | Piso não escurecia com o portal | `uAlpha ×= (1 − 0.6·p)` |
| N9 | Cards escureciam demais no portal (títulos sumiam) | dim só nos cards (×1−.72p); títulos/pills ficam |
| N10 | Velocidade "teleporte" do boot gerava rear-up de ~4s | guarda de salto (>0.045/frame) zera V |
| N11 | Título do card no mobile ficava sobre a 2ª linha da desc | título em fluxo no mobile (`relative s:absolute`) |
| N12 | Estilos duplicados do sheet (modal e rota) | `.sheet`, `.sheet__close`, `.sheet__title`, `.sheet__progress` compartilhados |
| N13 | `prefers-reduced-motion` não cobria sheet/portal | V=0 sem rear-up, `uTime=0`, animações do sheet desligadas |

## Movimento — valores finais

| Momento | Duração | Easing |
|---|---|---|
| Entrada dos cards | 1.25s (delay .1 + .05/card) | expo.out |
| Stack rise | 1.25s (delay .25 + .1) | expo.out |
| Títulos / textos / pills | 1.25s / 1.1s / .85s (stagger .075) | expo.out |
| Reveal por linha | janela de 1.1–1.25s, stagger por linha | expo.out |
| Dígitos (roll) | .9s | power3.out |
| Hover do card (dente 10% alt.) | .5s ida / .5s volta | expo.out |
| Hover de link (α ×.6) | .3s | power2.out |
| Hover de pill (lens + 1.03) | .7s / .5s | expo.out |
| Portal abre/fecha | .85s / .65s | "folio" (3 curvas do original) |
| Portal escala | .3s / .25s | power2.out |
| Piso fade-in | .9s | power2.out |
| Boot bars | .42s (stagger 80ms) | power2.inOut |
| Overlay do loader | .35s | power1.out |
| Modal (fade / sheet) | .3s / .55s | cubic-bezier(0,0,.2,1) / cubic-bezier(.23,1,.32,1) |
| Saída do modal | .3s | cubic-bezier(.4,0,1,1) |

Superfície (constantes do original): `D = .2W·(1+1.1·V)`, `T=1.15`, `C=1`, shift −.2, tail 1, `BANK=−.16`, diagonal `y += .03x`, rear-up `.1W/.2W` com `V`, twist `1.8·V` nas bordas; `lean A=−.12W` (cards `k=sheetP`, piso `k=1`); luz `LIGHT_DIR(−.4,.5,1)`, gloss 48, spec .35, diff .12.

## Diferenças que ficaram (e por quê)

| # | Item | Motivo |
|---|---|---|
| P1 | Texturas reais (arte/vídeo dos 8 projetos) | assets do original (DatoCMS/KTX2) — substituídos por placeholders com a mesma paleta |
| P2 | Esculturas 3D do portal (mão, esfera, asas) | assets 3D do original, sem licença |
| P3 | Reflexo dos cards nas linhas do piso | exige pass espelhado (render target) — descartado por custo; o original usa `u_refl` a 1/10 de resolução |
| P4 | Fonte ABC Diatype (paga) | Inter com peso 700 + tracking compensados (largura/brilho medidos) |
| P5 | Texto em SDF (crisp em qualquer corpo) | canvas 1:1 + hairline; residual p90 232 vs 251 no label de 1rem |
| P6 | Cursor com *trail* que deforma a cena (`u_ballWarp/u_ballShade`) | shader de warp global; implementado como dot |
| P7 | Transição "flight" card→página de projeto (o card vira o sheet) | o clone usa modal/rota; a coreografia de elemento compartilhado não foi portada |
| P8 | Trophy chip no projeto | depende de dados de prêmio que o mock não tem |
| P9 | Easter egg "llama rain" | gatilho/asset não determinados |
| P10 | Specular mais visível | é a matemática do original; em arte plana o brilho aparece mais do que sobre fotos |

## Fidelidade estimada (após a rodada 5)

| Seção | Visual | Movimento | Funcional |
|---|---|---|---|
| Cena 3D (cards/sheet/lean) | 95% | 95% | 100% |
| Piso/grade | 95% | 100% | 95% (sem reflexo) |
| Tipografia/chrome | 88% (fonte substituta) | 100% | 100% |
| Cards (texto/captions) | 90% (arte placeholder) | 95% | 100% |
| Portal/painéis | 80% (sem esculturas) | 92% | 100% |
| Modal de projeto | 85% (mídia placeholder) | 95% | 100% |
| Responsivo 375/768/1280/1920 | 95% | 95% | 100% |
| A11y/reduced motion | 100% | 100% | 100% |
