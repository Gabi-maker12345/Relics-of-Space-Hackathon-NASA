# ADR 001 — Stack final: Nuxt + Supabase; linha Next congelada

- **Estado:** aceite
- **Data:** 14 nov 2026
- **Decisão de:** Gabi (front) e Marcílio (back)

## Contexto

O repositório tem duas linhas divergentes:

- **`master`** — Next.js 16 + React 19, protótipo de portfólio sem backend.
- **`feat/backend-milestone-1`** — Nuxt 4 + Nitro + Supabase (API, admin, seed, i18n, narração,
  quiz, import NASA). É a linha que está em produção.

A demo do hackathon é servida a partir da linha Nuxt (`relics-of-space.vercel.app`), mas a
*Production Branch* do projeto Vercel ainda aponta para `master`. Um push/merge em `master`
faria o Vercel publicar o protótipo Next por cima do produto — foi essa a razão do alerta do #73.

## Decisão

1. A **stack final é Nuxt 4 + Nitro + Supabase**. O README, os docs e o deploy seguem essa linha.
2. A linha **Next (`master`) fica congelada**: sem desenvolvimento, sem merges, sem deploys.
   Mantém-se no histórico como protótipo de referência.
3. A produção é publicada pelo workflow **Deploy production**, que corre depois do CI verde num
   push para `feat/backend-milestone-*` (build no Vercel, `vercel deploy --prod`).
4. Trabalho novo faz-se na milestone ou em branches criadas a partir dela.

## Consequências

- **Nunca fazer push nem merge em `master`**: a *Production Branch* do Vercel ainda é `master` e
  um push lá dentro toma conta do alias de produção. Para mudar isso é preciso alterar a
  *Production Branch* no dashboard do Vercel (não há campo na API pública).
- O estado do repositório (default branch) é `feat/backend-milestone-1` e deve ficar assim.
- O protótipo Next continua acessível no histórico (`master`), mas não é o produto.
- Depois da demo: arquivar `master` (renomear para `archive/nextjs` ou eliminar) e remover
  artefactos da linha Next que tenham sobrado.
