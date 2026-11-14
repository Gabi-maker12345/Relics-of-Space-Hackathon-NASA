# Deploy e QA — checklist

> Estado: 14 nov 2026 · branch de deploy: `feat/backend-milestone-1` (Nuxt)
> `master` continua na linha Next.js e **não** é a base do deploy até haver
> reconciliação com a Gabi.

## Responsabilidades

| Frente | Dono | O que faz |
|---|---|---|
| **Supabase cloud** | nós (backend) | criar projeto, aplicar migrações, seed, admin, bucket, RLS, chaves e smoke do backend |
| **Vercel** | Gabi (front) | importar o repositório, configurar env com as chaves que passarmos, build/deploy, domínio e smoke do front |
| **Conteúdo/QA** | ambos | confirmar scope, créditos/fontes, narração, mobile/a11y e ecrã final |

**Handoff para a Vercel (o que a Gabi precisa de nós):**

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_KEY` (anon/publishable; pode ser pública)
- `NUXT_SUPABASE_SECRET_KEY` (service role; **secreta**, enviar por canal seguro, nunca no repositório nem em `NUXT_PUBLIC_*`)
- branch `feat/backend-milestone-1`
- build `npm run build`, Node 22/24

**O que não vai para a Vercel:** `ADMIN_PASSWORD`, seed SQL, chaves privadas em texto no chat/repo. O admin é criado por nós no Supabase; a Gabi não precisa da password.

## Estado da execução (14 nov)

- [x] Projeto Supabase cloud criado (`atcfpxpbhmxeqrnmrblq`).
- [x] Migrações aplicadas (`20261109000100` + `20261114000100`).
- [x] Seed aplicado: **12 relíquias / 48 factos / 24 mídias / 12 intros / 24 cenas com áudio**.
- [x] Admin criado (`admin@spacerelics.space`).
- [x] Bucket `relic-media` público, limite 50 MB, MIME types de imagem/vídeo/áudio.
- [x] RLS verificado: anon lê 12 relíquias; escrita anon devolve `401 / 42501`.
- [x] Smoke Nuxt contra o cloud: lista 12, detalhe Spirit com áudio, login admin, lista admin 12.
- [ ] Vercel (Gabi): env + deploy + domínio.
- [ ] Smoke de produção: `206` para áudio/vídeo, imagens, login, admin.
- [ ] Scope final/FE pendentes.

## 0. Antes de tocar em produção

- [ ] Scope da demo confirmado (12 relíquias atuais ou 13 categorias oficiais).
- [ ] Features novas congeladas durante o deploy.
- [ ] `npm run seed:check`, `npm run narration:check`, `npm run typecheck`,
      `npm run lint`, `npm run test` e `npm run build` verdes.
- [ ] `npm run test:integration` verde (Supabase local).
- [ ] Créditos/fontes revistos em `docs/data-sources.md`.
- [ ] Aviso “projeto independente, não afiliado à NASA” visível no site/README.
- [ ] Credenciais Vercel/Supabase cloud disponíveis.

## 1. Supabase cloud (nós)

1. Criar o projeto no Supabase cloud (região mais próxima).
2. Guardar:
   - `Project URL` → `NUXT_PUBLIC_SUPABASE_URL`
   - `anon/publishable key` → `NUXT_PUBLIC_SUPABASE_KEY`
   - `service_role/secret key` → `NUXT_SUPABASE_SECRET_KEY` (só no servidor/Vercel)
3. Ligar o CLI ao projeto:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Isto aplica as migrações, incluindo `20261114000100_relic_references.sql`.
Confirma no SQL Editor:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'relics'
  and column_name in ('reference_url', 'is_extra', 'intro_audio_url');
```

4. Aplicar o seed de demonstração **uma vez** (atenção: substitui as relíquias
   de demonstração por `slug`; não correr depois de editar essas relíquias no
   admin):

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

5. Criar o admin com as variáveis cloud:

```bash
NUXT_PUBLIC_SUPABASE_URL=... \
NUXT_PUBLIC_SUPABASE_KEY=... \
NUXT_SUPABASE_SECRET_KEY=... \
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
npm run setup:admin
```

6. Verificar:
   - bucket `relic-media` existe e é público;
   - RLS ativo em todas as tabelas;
   - `select count(*) from relics;` = 12 (ou o scope decidido);
   - `select count(*) from relic_media where audio_url is not null;` = 24.

## 2. Vercel (Gabi)

1. Importar o repositório na Vercel e escolher o branch
   `feat/backend-milestone-1` (ou o branch de release acordado).
2. Framework: Nuxt (detetado automaticamente). Build: `npm run build`.
3. Variáveis de ambiente (Production + Preview):
   - `NUXT_PUBLIC_SUPABASE_URL`
   - `NUXT_PUBLIC_SUPABASE_KEY`
   - `NUXT_SUPABASE_SECRET_KEY`
4. Não colocar `ADMIN_PASSWORD` no runtime; só no comando local de setup.
5. Deploy. Confirmar que `public/images/relics/` e
   `public/media/narration/` são servidos pela CDN da Vercel.
6. Configurar domínio + HTTPS e forçar HTTPS.
7. Confirmar que `NUXT_SUPABASE_SECRET_KEY` está apenas nas variáveis de
   servidor (nunca em `NUXT_PUBLIC_*`).
8. A Gabi devolve-nos a URL do deployment para o smoke conjunto.

## 3. Smoke tests (conjunto)

### Público

```bash
BASE=https://<dominio>

curl -s "$BASE/api/public/relics" | jq 'length'
curl -s "$BASE/api/public/relics/spirit" | jq '{name, steps: [.steps[] | {type, audio_url}]}'
curl -sI "$BASE/media/narration/spirit-intro.mp3"
curl -sI "$BASE/images/relics/spirit-1.jpg"
curl -s -r 0-1023 "$BASE/media/narration/spirit-intro.mp3" -o /tmp/part
```

- [ ] Lista devolve 12 (ou o scope acordado).
- [ ] Detalhe tem `steps` com `audio_url`.
- [ ] Áudio responde 200/`audio/mpeg`; range responde 206.
- [ ] Imagens respondem 200 e com cache.
- [ ] `?lang=en` faz fallback para PT sem erro.
- [ ] `/#spirit` abre o modal e a narração toca depois do gesto.
- [ ] Mute global, legendas e navegação por passos funcionam.
- [ ] Filtros `location`, `status` e `q` funcionam.
- [ ] Rascunhos não aparecem para anon.

### Admin

- [ ] Login com o admin criado.
- [ ] Criar relíquia, editar, publicar/despublicar.
- [ ] Media manager: adicionar imagem, reordenar, definir capa, remover.
- [ ] Campos de áudio de introdução e por cena.
- [ ] Upload direto (≤4 MB) e signed URL (>4 MB).
- [ ] NASA search + import com `credit` e `source_url`.
- [ ] Quiz CRUD (mesmo que a UI pública ainda não mostre).
- [ ] Traduções PT/EN (mesmo que a UI ainda não mostre).
- [ ] RLS: chamada anon a `/api/admin/**` devolve 401.

## 4. QA de AR (acceptance review)

| Área | Teste | Critério |
|---|---|---|
| Desktop | Chrome, Firefox, Safari | home, painel, modal e admin sem erros |
| Mobile | 390×844 (iOS/Android) | sheet full-screen, texto legível, botões tocáveis |
| Teclado | Tab/Shift+Tab/Esc/setas | todo o fluxo sem rato |
| Movimento reduzido | `prefers-reduced-motion` | sem parallax/transições longas |
| Áudio | autoplay após clique, play/pause, mute, legendas | nunca dois áudios ao mesmo tempo |
| Deep link | `/#slug` e recarregar | abre a relíquia correta |
| Dados | cada imagem/áudio | 200, crédito e fonte visíveis |
| Performance | Lighthouse mobile | sem erros críticos; mídia não bloqueia |
| Conteúdo | 12 relíquias | factos, cenas, áudio e links oficiais |

## 5. Rollback e operação

- **Vercel:** usar “Instant Rollback” para o deployment anterior.
- **Supabase:** ativar backups/PITR antes do seed; o seed não é reversível.
- **Storage:** o backup da base não inclui ficheiros; guardar/versionar os
  uploads antes de operações destrutivas.
- **Narração:** os MP3 estão no repositório; se o texto mudar, correr
  `npm run narration:generate` e voltar a fazer deploy.
- **Seed:** nunca correr `supabase/seed.sql` em produção depois de editar as
  relíquias de demonstração no admin.

## 6. Pendências conhecidas

- 0 quiz, 0 traduções EN, 0 vídeos no seed.
- 5 categorias oficiais em falta (ALSEP, Phoenix/InSight, Dawn, NEAR, Kepler) e
  Viking 2.
- FE-15 (upload/player/aviso de áudio), FE-16 (preview), FE-17 (NASA no admin),
  FE-18 (conteúdo EN), FE-19 (quiz UI), FE-20 (passaporte), FE-21 (a11y) e
  FE-24 (QA) continuam abertas.
- Edge TTS é um endpoint não oficial da Microsoft; o áudio é gerado antes do
  deploy e fica no repositório. O fallback `speechSynthesis` continua ativo.
- `master` (Next.js) não é a base do deploy.
