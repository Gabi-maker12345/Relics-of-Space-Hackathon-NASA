# Dependências — jesperlandberg-clone

Inventário das dependências do clone (gerado do `package.json` + `package-lock.json`,
verificado com `npm ls` e build de produção em **2026-10-30**).

## Ambiente de referência

| Item | Valor |
|---|---|
| Node | **24.22.1** (testado; `import.meta`/`private fields`/`Promise.withResolvers` usados) |
| npm | **11.19.1** |
| Lockfile | `package-lock.json`, **v3** (fonte da verdade para reprodução) |
| Módulos instalados | `npm ci` (não há `node_modules` versionado) |

> O `package.json` não declara `engines` nem `.nvmrc`. Se o projeto passar a rodar em
> CI, fixe a versão (ex.: `"engines": { "node": ">=24.0.0" }`) — o código usa
> `Promise.withResolvers` (Node ≥ 22) e o `nuxt prepare` do `postinstall`.

## Dependências de runtime

| Pacote | Declarado | Instalado | Papel no projeto | Onde |
|---|---|---|---|---|
| `nuxt` | `^4.6.3` | **4.6.3** | framework (SSR, roteamento, Vite, Nitro) | `nuxt.config.ts`, `app/` |
| `vue` | `^3.5.44` | **3.5.44** | componentes/composables | `app/**/*.vue` |
| `vue-router` | `^5.4.0` | **5.4.0** | rotas (`/`, `/full`, `/newsletter`, `/projects/[slug]`) | `app/pages/`, `usePanels.ts` |
| `three` | `^0.185.0` | **0.185.0** | engine WebGL (planos, sheet, piso, portal) | `app/composables/gl/*` |
| `tailwindcss` | `^4.3.3` | **4.3.3** | tokens (`@theme`), utilitários | `app/assets/css/main.css` |
| `@tailwindcss/vite` | `^4.3.3` | **4.3.3** | plugin Vite do Tailwind 4 | `nuxt.config.ts` |
| `@fontsource-variable/inter` | `^5.3.0` | **5.3.0** | Inter Variable (substituta da ABC Diatype, paga) | `main.css` (import) |

## Dependências de desenvolvimento

| Pacote | Declarado | Instalado | Papel |
|---|---|---|---|
| `typescript` | `^5.9.3` | **5.9.3** | tipos (`lang="ts"`, `nuxt typecheck`) |

## Transitivas relevantes (vêm via `nuxt`; versões do lock)

| Pacote | Versão | Por quê importa |
|---|---|---|
| `vite` | 8.3.5 | dev server/build do cliente |
| `nitropack` | 2.13.5 | servidor Nitro (`/api/subscribe`) |
| `@nuxt/vite-builder` | 4.6.3 | pipeline de build Nuxt |
| `@nuxt/kit` | 4.6.3 | módulos/plugins Nuxt |
| `@vue/compiler-sfc` | 3.5.44 | compilação dos SFCs |
| `esbuild` | 0.28.2 | bundling (`allowScripts` liberado) |
| `postcss` | 8.5.32 | pipeline CSS |
| `ofetch` | 1.5.1 | fetch tipado no server |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | `nuxt dev` (HMR, engine GL ativa) |
| `npm run build` | `nuxt build` → `.output/` (verificado: ~550 kB gzip, sem erros) |
| `npm run generate` | `nuxt generate` (SSG) |
| `npm run preview` | `nuxt preview` |
| `postinstall` | `nuxt prepare` (gera `.nuxt/`) |

## `allowScripts`

```json
"allowScripts": { "esbuild@0.28.2": true }
```

Libera o postinstall do `esbuild` (binário nativo usado pelo Vite/Nuxt). Sem isso, o
build falha em ambientes que bloqueiam scripts de dependências.

## Assets, fontes e serviços externos

| Dependência externa | Situação |
|---|---|
| Fonte **ABC Diatype Plus Variable** (original) | **não incluída** (licença paga) → Inter Variable + compensação de peso/tracking (ver `DIFF_REPORT.md`) |
| Texturas dos 8 projetos (KTX2/DatoCMS) | **não incluídas** (assets do original) → `public/placeholders/*.svg` + `public/textures/manifest.json` |
| Esculturas 3D do portal | **não incluídas** (assets do original) |
| `POST /api/subscribe` | **stub local** (`server/api/subscribe.post.ts`): valida e-mail, honeypot e latência simulada; não chama serviço externo |
| `GET /llms.txt` | arquivo estático em `public/llms.txt` |

## Reprodução

```bash
npm ci          # lockfile v3, sem rede além do registry
npm run dev     # http://localhost:3000
npm run build   # .output/ (server + client)
```

## Limpeza aplicada

- `gsap@3.15.0` estava **instalado e no lockfile** sem constar no `package.json`
  (`npm ls` marcava como *extraneous*) e **sem nenhum import** no código (o engine tem
  tween próprio). Removido com `npm prune`; o lockfile agora tem **0** referências a
  `gsap` e o build de produção foi re-verificado depois da remoção.
