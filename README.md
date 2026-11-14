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

# 2. Supabase local (Docker tem de estar a correr)
npm run supabase:start
# imprime as chaves locais; copia-as para o .env (ver abaixo)

# 3. Variáveis de ambiente
cp .env.example .env
# preencher NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_KEY e
# NUXT_SUPABASE_SECRET_KEY (valores de `npx supabase status`)

# 4. Admin inicial
npm run setup:admin

# 5. Servidor
npm run dev
```

Abre `http://localhost:3000`. O painel fica em `/admin` e o índice em `/full`.
O Supabase Studio local fica em `http://127.0.0.1:54323` e o Mailpit (emails de
teste) em `http://127.0.0.1:54324`.

### Supabase local

A stack local é definida por [`supabase/config.toml`](supabase/config.toml):

- registo público **desativado** (`enable_signup = false`): o único caminho de
  entrada é `npm run setup:admin`;
- password mínima de 8 caracteres;
- migrações e `seed.sql` aplicados automaticamente no arranque.

```bash
npm run supabase:start    # arranca Postgres, Auth, Storage, Studio, Mailpit
npm run supabase:reset    # recria a BD + migrações + seed
npm run supabase:stop     # pára os containers
```

O seed de demonstração é gerado a partir de
[`data/relics.json`](data/relics.json), a fonte única partilhada com o fallback
SSR do front (`app/data/relics.ts`). O gerador escreve **URLs absolutos** do
Storage (`relic-media/assets/...`) usando `SUPABASE_STORAGE_BASE`; o bucket tem
de ter os ficheiros antes de servir o site:

```bash
npm run media:upload      # sobe public/images + public/media para o bucket
npm run seed:generate     # regenera supabase/seed.sql com URLs do Storage
npm run seed:check        # falha se o SQL estiver desatualizado ou tiver caminhos locais
npm run narration:generate # gera os MP3 com Edge TTS e atualiza o JSON/seed
npm run narration:check    # falha se faltar algum MP3 (corre na CI)
```

A narração é sintética, gerada com Edge TTS (`pt-PT-RaquelNeural`) a partir dos
nossos textos PT, e fica em `public/media/narration/`. Não é áudio NASA; o
`speechSynthesis` do browser continua como fallback. Ver
[`docs/data-sources.md`](docs/data-sources.md) e
[`docs/deploy-checklist.md`](docs/deploy-checklist.md).

O seed é idempotente: apaga as relíquias de demonstração por `slug` e volta a
inseri-las com factos e mídias (o `on delete cascade` limpa os filhos). Correr
duas vezes deixa exatamente as mesmas 12 relíquias, 48 factos e 24 mídias.

Cada relíquia tem `reference_url` (página oficial da missão ou registo NSSDC) e
`is_extra`. O **Voyager 1/2** ficam marcados como extra porque não estão na lista
oficial de resources do desafio; o **Surveyor 3** substituiu o Lunokhod 1, que
não é equipamento NASA.

Depois de alterar o esquema, gera os tipos:

```bash
npx supabase gen types typescript --local > app/types/database.types.ts
```

### Smoke test

Com `npm run dev` e o Supabase local a correr, valida o caminho completo
(login, sessão, guarda admin, RLS de leitura e de escrita):

```bash
npm run smoke
```

O script [`scripts/smoke.mjs`](scripts/smoke.mjs) usa `BASE_URL` (por omissão
`http://127.0.0.1:3000`) e as credenciais `ADMIN_*` do `.env`.

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
| `npm run smoke` | valida login, sessão, guarda admin e RLS |
| `npm run seed:generate` | regenera `supabase/seed.sql` a partir de `data/relics.json` |
| `npm run seed:check` | verifica que o seed gerado está atualizado e sem caminhos locais |
| `npm run media:upload` | sobe `public/images` + `public/media` para o bucket e repara URLs locais |
| `npm run narration:generate` | regenera os MP3 de narração com Edge TTS |
| `npm run narration:check` | verifica que todos os MP3 de narração existem |
| `npm run supabase:start` | arranca o Supabase local |
| `npm run supabase:reset` | recria a BD, migrações e seed |
| `npm run supabase:stop` | pára o Supabase local |

---

## Estrutura

```
app/                  front (páginas, componentes, GL)
server/               endpoints Nitro e repositórios (a partir da BE-03)
tests/                testes unitários
data/
  relics.json         fonte única das relíquias do seed
supabase/
  config.toml         configuração do CLI / stack local
  migrations/         esquema + RLS + storage policies
  seed.sql            seed de demonstração gerado (idempotente)
docs/                 arquitetura e esquema
  database.md         esquema, RLS e seed
  testing.md          testes unitários/integração
  data-sources.md     fontes oficiais, créditos e conformidade
  deploy-checklist.md deploy e QA de aceitação
public/
  images/relics/      imagens oficiais do seed
  media/narration/    narração sintética (36 MP3)
```

### API

Contrato partilhado em `shared/types/relic.ts`: toda a resposta é um `Relic`
(`id` = slug, `tagline`, `body`, `facts`, `image`, `scenes`, `published`) e o
formulário envia um `RelicInput` no mesmo dialeto.

Público (cliente anon + RLS; rascunhos nunca aparecem; cache `public, max-age=60, s-maxage=300, stale-while-revalidate=600`):

- `GET /api/public/relics` (e `/public/relics`) — lista leve com apenas os campos do painel (`slug`, `name`, `summary`, `status`, `location`, capa e seu tipo). Suporta filtros `location`, `status`, pesquisa `q` por nome, ordenação `sort` (`name` | `created_at`) e `order` (`asc` | `desc`) e `lang` (`pt` por omissão, ou `en`).
- `GET /api/public/relics/:slug` (e `/public/relics/:slug`) — detalhe completo (ficha técnica, `steps`, mídias, quiz; UUID ainda aceite para links antigos). `?lang=en` devolve textos e áudios traduzidos quando existirem.
- `POST /api/public/relics/:slug/quiz/check` — `{ "question_id": "…", "option_index": 0 }`; devolve `correct`, `correct_index` e `explanation` sem expor a resposta no detalhe.

Admin (requer sessão Supabase com `is_admin`):

- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `GET|POST /api/admin/relics`
- `GET|PUT|DELETE /api/admin/relics/:id` — `:id` é o slug ou o UUID
- `POST /api/admin/upload` — upload direto, limitado a 4 MB (limite de body das
  functions da Vercel)
- `POST /api/admin/upload/sign` — devolve uma *signed upload URL* para o browser
  enviar ficheiros grandes (até 50 MB) diretamente para o Storage
- `POST /api/admin/storage/delete` — remove objetos do bucket, apenas dentro do
  prefixo `relics/`
- `GET /api/admin/nasa/search?q=…` — pesquisa a biblioteca oficial de imagens e
  vídeos da NASA e devolve `nasa_id`, título, tipo, miniatura, crédito e
  `source_url`; aceita `media_type`, `page` e `page_size`
- `POST /api/admin/relics/:id/media/import` — `{ "nasa_id": "…" }` importa um
  resultado da NASA como mídia da relíquia, com `credit` e `source_url`
  preenchidos e sem copiar o ficheiro para o Storage. No painel, o botão
  **Importar da NASA** abre a pesquisa e acrescenta a cena ao rascunho; numa
  relíquia nova é preciso guardar primeiro.
- `POST /api/admin/relics/:id/media` — adiciona uma mídia (capa opcional via
  `is_cover`); sem `position` fica no fim
- `PATCH|DELETE /api/admin/media/:id` — edita/remove uma mídia
- `PUT /api/admin/relics/:id/media/order` — `{ "ids": [...] }` com **todas** as
  mídias da relíquia, pela nova ordem
- `PUT /api/admin/relics/:id/cover` — `{ "media_id": "…" }` ou `null`; aceita
  imagem ou vídeo
- `GET|POST /api/admin/relics/:id/quiz` — lista as perguntas **com**
  `correct_index` ou adiciona uma (máximo 8 por relíquia)
- `PUT /api/admin/relics/:id/quiz` — substitui o quiz inteiro (editor em lote)
- `POST /api/admin/relics/:id/quiz/generate` — gera 8 perguntas com um provider
  OpenAI-compatível; requer `QUIZ_AI_API_KEY` (sem chave devolve 503)
- `PATCH|DELETE /api/admin/quiz/:id` — edita/remove uma pergunta (as traduções
  seguem em cascata)
- `PUT /api/admin/relics/:id/quiz/order` — `{ "ids": [...] }` com **todas** as
  perguntas da relíquia, pela nova ordem
- `POST /api/admin/narration/generate` — gera um MP3 com Edge TTS, guarda no
  Storage e devolve `{ url, path, bytes, voice }`
- `GET|PUT /api/admin/relics/:id/translations/:lang` — lê/grava uma língua
  (`en`, `pt-BR`, …); ver [Idiomas](#idiomas-be-12)

`PUT` só altera os campos enviados (publicar/despublicar é `{ "published": true }`)
e o slug só muda quando o identificador é editado. `POST/PUT` devolvem sempre o
`Relic` mapeado, com factos e cenas gravados.

Cada item de `scenes` expõe `id`, `kind`, `src`, `poster`, `kicker`, `title`,
`body`, `credit`, `source_url`, `audio_url`, `mute_video` e `is_cover`. A capa
está sempre marcada em exatamente uma cena; se for um vídeo, `Relic.image` é o
respetivo `poster`. Cada relíquia tem também `intro_audio_url`.

`PUT /api/admin/relics/:id` com `scenes` substitui a lista de mídias (é o que o
formulário atual envia). Para preservar ids e áudio por item, usa os endpoints
de mídia; `PATCH` rejeita `position` e a ordem altera-se só pelo endpoint
`media/order`.

O detalhe inclui `steps` (introdução + um passo por mídia, pela ordem) e
`total_steps`, prontos para o executor de scroll: cada passo tem `index`,
`type` (`intro`/`image`/`video`), `title`, `caption`, `audio_url` e, nas mídias,
`media_id`, `src`, `poster` e `credit`. Uma relíquia sem mídias devolve apenas o
passo de introdução. Respostas admin incluem ainda `warnings` (por exemplo,
mídia sem áudio ou sem legenda) — avisos, nunca erros de validação.

O quiz público (`Relic.quiz`) devolve `id`, `position`, `question`, `options` e
`explanation`, mas **nunca** `correct_index`. As respostas admin incluem o
índice correto; o `POST` valida que ele aponta para uma opção existente e o
limite é de 8 perguntas por relíquia. A correção de uma resposta pública é feita
por `POST /api/public/relics/:slug/quiz/check`.

A importação da NASA guarda apenas a URL oficial do asset (`~medium.jpg` para
imagens, `~mobile.mp4` para vídeos) e o respetivo `poster`, em vez de copiar o
ficheiro para o Storage. O `credit` é normalizado a partir de
`secondary_creator`/`center` (por exemplo `JPL` → `NASA/JPL-Caltech`) e o
`source_url` aponta para `images.nasa.gov/details/<nasa_id>`. Itens de áudio são
recusados com 400; falhas da NASA devolvem 502 com uma mensagem clara.

### Idiomas (BE-12)

As colunas base da tabela são português; uma tradução vive nas tabelas
`relic_translations`, `media_translations` e `quiz_question_translations`. Os
endpoints públicos aceitam `?lang=` (código de duas letras, opcionalmente com
região: `en`, `pt-BR`). Cada campo é sobreposto individualmente e, quando falta
ou está vazio, cai para o valor português — nunca devolve 404 por falta de
tradução. Um `lang` inválido é ignorado e resolve para `pt`.

`GET /api/admin/relics/:id/translations/:lang` devolve `{ relic, media, quiz }`
com as linhas existentes (ou `null`/listas vazias). `PUT` aceita campos
parciais (`name`, `mission`, `summary`, `story_text`, `alt`, `intro_audio_url`,
`media[]`, `quiz[]`): os campos omitidos mantêm o valor anterior, `null` limpa
um URL e os ids de mídia/pergunta têm de pertencer à relíquia (400 caso
contrário).

### Uploads

O browser nunca envia ficheiros grandes pela API: pede uma assinatura a
`/api/admin/upload/sign`, envia o ficheiro para o `signedUrl` devolvido e guarda
o `path`/`publicUrl` na relíquia. Os limites (imagem 5 MB, áudio 15 MB, vídeo
50 MB) e os MIME permitidos em `server/utils/upload.ts` espelham o bucket
`relic-media`; um teste unitário falha se divergirem.

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
