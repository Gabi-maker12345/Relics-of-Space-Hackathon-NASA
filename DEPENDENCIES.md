# Dependências — Zénite

Inventário das dependências do projeto (fonte: `package.json` / `package-lock.json`),
verificado em **2026-11-15**.

## Ambiente de referência

| Item | Valor |
|---|---|
| Node | **24 LTS** (engines: `^22.22.3 || ^24.15.0 || >=26.0.0`; `.nvmrc` = 24) |
| npm | 11.x |
| Lockfile | `package-lock.json`, **v3** |
| Instalação | `npm ci` (não há `node_modules` versionado) |

## Runtime

| Pacote | Versão |
|---|---|
| `@fontsource-variable/inter` | `^5.3.0` |
| `@fontsource-variable/newsreader` | `^5.3.0` |
| `@nuxtjs/supabase` | `^2.1.0` |
| `@supabase/supabase-js` | `^2.119.0` |
| `@tailwindcss/vite` | `^4.3.3` |
| `gsap` | `^3.15.0` |
| `lenis` | `^1.3.26` |
| `msedge-tts` | `^2.1.1` |
| `nuxt` | `^4.6.4` |
| `tailwindcss` | `^4.3.3` |
| `three` | `^0.185.0` |
| `vue` | `^3.5.44` |
| `vue-router` | `^5.4.0` |
| `zod` | `^4.6.7` |

## Desenvolvimento / qualidade

| Pacote | Versão |
|---|---|
| `@nuxt/eslint` | `^1.17.0` |
| `@nuxt/test-utils` | `^4.4.0` |
| `@types/three` | `^0.185.4` |
| `eslint` | `^9.39.5` |
| `happy-dom` | `^21.0.4` |
| `supabase` | `^3.0.0` |
| `typescript` | `^5.9.3` |
| `vitest` | `^5.1.0` |
| `vue-tsc` | `^3.3.14` |

## Notas

- **Supabase** é a base de dados, autenticação e storage; `/api/admin/**` usa a
  secret key só no servidor.
- `supabase` (CLI) é opcional: necessário para migrações/seed locais.
- `msedge-tts` gera a narração sintética (`scripts/generate-narration.mjs`).
- O build/deploy é Nuxt 4 (preset Nitro na Vercel); ver `README.md`.
