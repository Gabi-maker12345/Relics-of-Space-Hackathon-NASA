# Space Relics

> *Abandonados, mas não esquecidos.*

Arquivo vivo das máquinas que a humanidade deixou na Lua, em Marte e no espaço profundo.
Nuxt 4 + Three.js no front, **Supabase** como base de dados, autenticação e armazenamento.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Nuxt 4 / Vue 3 / Nitro |
| UI / 3D | Three.js, GSAP, Lenis, Tailwind 4 |
| Base de dados | Supabase Postgres + Row Level Security |
| Auth | Supabase Auth (email + password, sem registo público) |
| Ficheiros | Supabase Storage (`relic-media` bucket) |
| Deploy | Vercel (preset Nitro automático) |
| Qualidade | ESLint, `nuxt typecheck`, Vitest, GitHub Actions |

### Decisão de arquitetura (BE-01)

Foi escolhido **Supabase** em vez de um backend próprio porque:

- Postgres gerido, Auth e Storage num só serviço — menos infraestrutura para a hackathon.
- RLS permite leitura pública segura sem expor o servidor.
- Vercel serve o front e as API routes Nitro; o Supabase fica atrás.

As escritas passam por **API routes Nitro** (`/api/admin/**`) que validam a sessão
Supabase e usam a *secret key* apenas no servidor. O browser nunca vê a service role.
Não há CORS: front e API são same-origin.

---

## Requisitos

- **Node.js >= 22.22** (recomendado 24 LTS). O projeto usa APIs de Node 22+.
- Conta Supabase e um projeto criado.
- (Opcional) Supabase CLI para migrações: `npx supabase --version`.

---

## Arranque local

```bash
# 1. Dependências
npm ci

# 2. Variáveis de ambiente
cp .env.example .env
# preencher NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY e
# NUXT_SUPABASE_SECRET_KEY

# 3. Base de dados (ver secção abaixo)

# 4. Servidor
npm run dev
```

Abre `http://localhost:3000`. O painel fica em `/admin` e o índice em `/full`.

### Variáveis

| Variável | Onde | Descrição |
|---|---|---|
| `NUXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase |
| `NUXT_PUBLIC_SUPABASE_KEY` | público | anon/publishable key (protegida por RLS) |
| `NUXT_SUPABASE_SECRET_KEY` | **servidor** | service role/secret key; nunca vai para o browser |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | script | bootstrap do primeiro administrador |

> ⚠️ A secret key ignora RLS. Só pode ser usada em `server/**` e nunca em
> `app/**` ou em variáveis `NUXT_PUBLIC_*`.

---

## Base de dados

As migrações vivem em `supabase/migrations/` e são SQL puro, versionado.

```bash
# opção A — CLI ligada ao projeto remoto
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push

# opção B — Supabase Dashboard → SQL Editor
# executar os ficheiros por ordem: 0001_..., 0002_...
```

O esquema está documentado em [`docs/database.md`](docs/database.md).

### Criar o administrador

O registo público está desativado. O primeiro admin é criado com a secret key:

```bash
npm run setup:admin
```

O script lê `ADMIN_EMAIL` e `ADMIN_PASSWORD`, cria/atualiza o utilizador no
Supabase Auth e garante a linha correspondente em `admin_users`.

---

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run preview` | serve o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `vue-tsc` via Nuxt |
| `npm run test` | testes unitários (Vitest) |
| `npm run test:watch` | testes em watch |
| `npm run setup:admin` | cria o administrador inicial |

---

## Estrutura

```
app/                  front (páginas, componentes, GL)
server/               endpoints Nitro e repositórios (a partir da BE-03)
tests/                testes unitários
supabase/
  config.toml         configuração do CLI / stack local
  migrations/         esquema + RLS + storage policies
  seed.sql            dados de demonstração (idempotente)
docs/                 arquitetura e esquema
```

### API (contrato planeado — implementação a partir da BE-03)

Público:

- `GET /api/public/relics` — lista leve (filtros `location`, `status`, `q`, `lang`)
- `GET /api/public/relics/:slug` — detalhe + `steps` de narração

Admin (requer sessão Supabase com `is_admin`):

- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET|POST /api/admin/relics`
- `GET|PATCH|DELETE /api/admin/relics/:id`
- `POST /api/admin/relics/:id/media`
- `PATCH|DELETE /api/admin/media/:id`
- `PUT /api/admin/relics/:id/media/order`
- `PUT /api/admin/relics/:id/cover`
- `POST /api/admin/upload`

---

## Fluxo de trabalho

1. Uma branch por issue (`be-02-schema`, `be-03-auth`, …) a partir de
   `feat/backend-milestone-1`.
2. PR para a milestone branch, com descrição e evidência de testes.
3. CI obrigatório: lint + typecheck + testes.
4. Review (humano ou agente) antes do merge.
5. Merge com squash.

---

## Deploy (Vercel)

1. Importar o repositório na Vercel.
2. Definir as variáveis de ambiente (as três do Supabase + `ADMIN_*` apenas se
   correres o script na Vercel).
3. Build command: `npm run build`. Output: detetado automaticamente pelo Nitro.
4. Aplicar as migrações ao projeto Supabase antes do primeiro deploy.

---

## English summary

Space Relics is a Nuxt 4 + Three.js museum of abandoned space hardware. The
backend is Supabase (Postgres, Auth, Storage); Nitro API routes in `server/`
enforce validation and admin authorization. The browser uses the public anon key
under RLS, while the service role key stays server-side. One branch and one PR
per issue, with CI (lint, typecheck, tests) before merging into the backend
milestone branch. See `.env.example` and `docs/database.md`.
