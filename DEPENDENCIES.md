# Dependências — Space Relics

Inventário das dependências depois da migração **Nuxt/Vue → Next.js 16 (App Router) + React 19**.
Verificado com `npm ls --depth=0` e build de produção em **2026-11-04**.

## Ambiente de referência

| Item | Valor |
|---|---|
| Node | **24.22.1** |
| npm | **11.19.1** |
| Lockfile | `package-lock.json` (fonte da verdade) |
| Framework | Next.js **16.4.5** (Turbopack, App Router) |

## Runtime

| Pacote | Declarado | Instalado | Papel | Onde |
|---|---|---|---|---|
| `next` | `^16.4.5` | **16.4.5** | framework (SSR/SSG, rotas, Turbopack) | `app/` |
| `react` / `react-dom` | `^19.3.1` | **19.3.1** | UI, hooks, `createPortal` | `src/components`, `src/hooks` |
| `three` | `^0.185.0` | **0.185.1** | engine WebGL (planos, sheet, piso, portal) | `src/gl/*` |
| `gsap` | `^3.15.0` | **3.15.1** | entrada/saída do modal e stagger | `src/components/ProjectModal.tsx` |
| `lenis` | `^1.3.26` | **1.3.27** | scroll suave (ignora `[data-lenis-prevent]`) | `src/lib/smoothScroll.ts` |
| `tailwindcss` | `^4.3.4` | **4.3.4** | tokens (`@theme`) + utilitários | `src/styles/main.css` |
| `@fontsource-variable/inter` | `^5.3.0` | **5.3.0** | Inter Variable (substituta da ABC Diatype) | `app/layout.tsx` |
| `@fontsource-variable/newsreader` | `^5.3.0` | **5.3.0** | Newsreader Variable (títulos serifados) | `app/layout.tsx` |

## Dev

| Pacote | Papel |
|---|---|
| `typescript` **5.9.3** | tipos; `tsc --noEmit` no build do Next |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/three` | tipos |
| `@tailwindcss/postcss` **4.3.4** | pipeline PostCSS do Tailwind 4 (`postcss.config.mjs`) |

## Sem dependência de runtime de backend

As relíquias vivem em `useRelics` (seed em `src/data/relics.ts` + `localStorage`) e a sessão em
`useAuth` (demo). Não há servidor, base de dados nem API — os 15 cartões `BE-*` continuam
fora do âmbito.

## Scripts

| Script | Comando |
|---|---|
| `dev` | `next dev` (porta 3000) |
| `build` | `next build` |
| `start` | `next start` |
| `typecheck` | `tsc --noEmit` |
