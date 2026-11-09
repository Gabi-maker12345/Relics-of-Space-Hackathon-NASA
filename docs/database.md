# Database schema

Postgres (Supabase) schema for Space Relics. Migrations live in
[`supabase/migrations/`](../supabase/migrations) and are applied in filename
order.

## Diagram

```mermaid
erDiagram
  auth_users ||--o| admin_users : "is admin"
  relics ||--o{ relic_facts : "has"
  relics ||--o{ relic_media : "has"
  relics ||--o{ relic_translations : "translated by"
  relics ||--o{ quiz_questions : "has"
  relic_media ||--o{ media_translations : "translated by"
  quiz_questions ||--o{ quiz_question_translations : "translated by"
  relic_media ||--o| relics : "cover of"

  relics {
    uuid id PK
    text slug UK
    text name
    text mission
    text summary
    text story_text
    text status "active|silent|lost"
    text location "moon|mars|deep_space"
    bool published
    timestamptz published_at
    uuid cover_media_id FK
    text intro_audio_url
    text alt
    text ratio
  }

  relic_facts {
    uuid id PK
    uuid relic_id FK
    text label
    text value
    int position
  }

  relic_media {
    uuid id PK
    uuid relic_id FK
    text type "image|video"
    text url
    text poster_url
    text kicker
    text title
    text caption
    text credit
    text source_url
    text audio_url
    bool mute_video
    int position
  }

  relic_translations {
    uuid relic_id PK,FK
    text lang PK
    text name
    text mission
    text summary
    text story_text
    text alt
    text intro_audio_url
  }

  media_translations {
    uuid media_id PK,FK
    text lang PK
    text kicker
    text title
    text caption
    text audio_url
  }

  quiz_questions {
    uuid id PK
    uuid relic_id FK
    int position
    text question
    jsonb options
    int correct_index
    text explanation
  }

  quiz_question_translations {
    uuid question_id PK,FK
    text lang PK
    text question
    jsonb options
    text explanation
  }

  admin_users {
    uuid user_id PK,FK
    text email UK
    timestamptz created_at
  }
```

`auth.users` is managed by Supabase Auth. `admin_users` is the allow-list that
grants write access.

## Design decisions

| Decision | Why |
|---|---|
| `relics.cover_media_id` instead of `relic_media.is_cover` | One row can never be the cover of two relics; uniqueness is structural. The API still exposes `is_cover` on media responses. |
| `relic_facts` as label/value rows | The UI renders an arbitrary ordered fact sheet; fixed columns would not fit it. |
| Base table columns are Portuguese, translations are rows | Existing content stays valid without a translation. Missing fields fall back to the base row. |
| `caption` holds the narration text | It doubles as transcript/caption for accessibility (FE-11). |
| `audio_url` on relic + media | Intro audio and one audio per scroll step (BE-06/BE-07). |
| `jsonb options` + `correct_index` | Matches the quiz contract and is validated by a CHECK constraint. |
| Public storage bucket | The museum is public; uploads are performed server-side with the secret key, so no write policy is exposed. |

## RLS matrix

| Table | anon | authenticated (non-admin) | admin |
|---|---|---|---|
| `relics` | `select` where `published` | same | full |
| `relic_facts` | `select` when parent published | same | full |
| `relic_media` | `select` when parent published | same | full |
| `relic_translations` | `select` when parent published | same | full |
| `media_translations` | `select` when parent published | same | full |
| `quiz_questions` | `select` when parent published | same | full |
| `quiz_question_translations` | `select` when parent published | same | full |
| `admin_users` | no access | own row only if admin | full |

`public.is_admin()` is `security definer` and reads `admin_users` to avoid
recursive RLS. Public write access is denied by the absence of anon write
policies.

## `steps` derivation (BE-07)

The detail endpoint builds a deterministic list:

1. `intro` — `intro_audio_url`, the relic `story_text`.
2. One step per media row, ordered by `position`, with `audio_url`, `caption`
   and `type`.
3. `total_steps = steps.length`; the UI computes `100 / N`.

A relic without media returns only the intro step. Missing audio/caption is a
warning in the admin, not a database error.

## Migrations

```bash
# link once
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"

# apply all pending migrations
npx supabase db push

# local stack (Docker required)
npx supabase start
npx supabase db reset   # migrations + seed
```

Generate TypeScript types after schema changes:

```bash
npx supabase gen types typescript --linked > app/types/database.types.ts
```

The checked-in [`app/types/database.types.ts`](../app/types/database.types.ts)
matches migration `20261109000100_core_schema.sql`.

## Seed

[`supabase/seed.sql`](../supabase/seed.sql) inserts the three demo relics
(Apollo LM, Opportunity, Viking 1). It is idempotent: relics are upserted by
slug, then their facts and media are replaced. BE-14 expands the seed to the
full nine-relic catalogue.
