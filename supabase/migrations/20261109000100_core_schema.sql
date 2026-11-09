-- ---------------------------------------------------------------------------
-- Space Relics — core schema (BE-02)
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid).
--   * Base columns hold the default language (pt). Translations live in
--     dedicated tables and fall back to the base row.
--   * Every table is protected by RLS: public reads only published relics,
--     writes only for rows in admin_users.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Keep updated_at honest without relying on the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- published_at follows the published flag.
create or replace function public.sync_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.published and (tg_op = 'INSERT' or old.published is distinct from true) then
    new.published_at = now();
  elsif not new.published then
    new.published_at = null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Security definer so policies can read admin_users without recursive RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Relics
-- ---------------------------------------------------------------------------

create table public.relics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null
    check (length(btrim(name)) between 1 and 160),
  mission text not null default '',
  summary text not null default '',
  story_text text not null default '',
  status text not null default 'active'
    check (status in ('active', 'silent', 'lost')),
  location text not null default 'moon'
    check (location in ('moon', 'mars', 'deep_space')),
  published boolean not null default false,
  published_at timestamptz,
  -- Single source of truth for the cover. The API exposes it as `is_cover`
  -- on the matching media row.
  cover_media_id uuid,
  intro_audio_url text,
  alt text not null default '',
  ratio text not null default '1376 / 768',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index relics_published_idx on public.relics (published);
create index relics_location_idx on public.relics (location);
create index relics_status_idx on public.relics (status);
create index relics_name_lower_idx on public.relics (lower(name));

-- ---------------------------------------------------------------------------
-- Fact sheet (arbitrary label/value rows, ordered)
-- ---------------------------------------------------------------------------

create table public.relic_facts (
  id uuid primary key default gen_random_uuid(),
  relic_id uuid not null references public.relics (id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  value text not null check (length(btrim(value)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index relic_facts_relic_position_idx
  on public.relic_facts (relic_id, position);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

create table public.relic_media (
  id uuid primary key default gen_random_uuid(),
  relic_id uuid not null references public.relics (id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null check (length(btrim(url)) > 0),
  poster_url text,
  kicker text not null default '',
  title text not null default '',
  -- Narration / transcript for this step.
  caption text not null default '',
  credit text not null default '',
  source_url text,
  audio_url text,
  mute_video boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index relic_media_relic_position_idx
  on public.relic_media (relic_id, position);
create index relic_media_type_idx on public.relic_media (type);

alter table public.relics
  add constraint relics_cover_media_fk
  foreign key (cover_media_id)
  references public.relic_media (id)
  on delete set null;

-- A cover must belong to the relic it covers.
create or replace function public.validate_cover_media()
returns trigger
language plpgsql
as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1
    from public.relic_media m
    where m.id = new.cover_media_id
      and m.relic_id = new.id
  ) then
    raise exception 'cover_media_id % does not belong to relic %',
      new.cover_media_id, new.id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Translations (base columns remain the pt fallback)
-- ---------------------------------------------------------------------------

create table public.relic_translations (
  relic_id uuid not null references public.relics (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}(-[A-Za-z]{2})?$'),
  name text,
  mission text,
  summary text,
  story_text text,
  alt text,
  intro_audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (relic_id, lang)
);

create table public.media_translations (
  media_id uuid not null references public.relic_media (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}(-[A-Za-z]{2})?$'),
  kicker text,
  title text,
  caption text,
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (media_id, lang)
);

-- ---------------------------------------------------------------------------
-- Quiz
-- ---------------------------------------------------------------------------

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  relic_id uuid not null references public.relics (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  question text not null check (length(btrim(question)) > 0),
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5),
  correct_index integer not null check (correct_index >= 0),
  explanation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_correct_index_in_range
    check (correct_index < jsonb_array_length(options)),
  constraint quiz_unique_position
    unique (relic_id, position) deferrable initially deferred
);

create table public.quiz_question_translations (
  question_id uuid not null
    references public.quiz_questions (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}(-[A-Za-z]{2})?$'),
  question text,
  options jsonb
    check (
      options is null
      or (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5)
    ),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, lang)
);

-- ---------------------------------------------------------------------------
-- updated_at / published_at triggers
-- ---------------------------------------------------------------------------

create trigger relics_updated_at
  before update on public.relics
  for each row execute function public.set_updated_at();

create trigger relics_published_at
  before insert or update of published on public.relics
  for each row execute function public.sync_published_at();

create trigger relics_cover_media
  before insert or update of cover_media_id on public.relics
  for each row execute function public.validate_cover_media();

create trigger relic_media_updated_at
  before update on public.relic_media
  for each row execute function public.set_updated_at();

create trigger quiz_questions_updated_at
  before update on public.quiz_questions
  for each row execute function public.set_updated_at();

create trigger relic_translations_updated_at
  before update on public.relic_translations
  for each row execute function public.set_updated_at();

create trigger media_translations_updated_at
  before update on public.media_translations
  for each row execute function public.set_updated_at();

create trigger quiz_translations_updated_at
  before update on public.quiz_question_translations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.relics enable row level security;
alter table public.relic_facts enable row level security;
alter table public.relic_media enable row level security;
alter table public.relic_translations enable row level security;
alter table public.media_translations enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_question_translations enable row level security;

-- Admin allow-list: only admins can see or change it.
create policy admin_users_admin_all
  on public.admin_users
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Relics: public reads published rows, admins manage everything.
create policy relics_public_read
  on public.relics
  for select
  to anon, authenticated
  using (published = true);

create policy relics_admin_all
  on public.relics
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Child tables: public reads only when the parent relic is published.
create policy relic_facts_public_read
  on public.relic_facts
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.relics r
      where r.id = relic_id and r.published = true
    )
  );

create policy relic_facts_admin_all
  on public.relic_facts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy relic_media_public_read
  on public.relic_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.relics r
      where r.id = relic_id and r.published = true
    )
  );

create policy relic_media_admin_all
  on public.relic_media
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy relic_translations_public_read
  on public.relic_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.relics r
      where r.id = relic_id and r.published = true
    )
  );

create policy relic_translations_admin_all
  on public.relic_translations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy media_translations_public_read
  on public.media_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.relic_media m
      join public.relics r on r.id = m.relic_id
      where m.id = media_id and r.published = true
    )
  );

create policy media_translations_admin_all
  on public.media_translations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy quiz_questions_public_read
  on public.quiz_questions
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.relics r
      where r.id = relic_id and r.published = true
    )
  );

create policy quiz_questions_admin_all
  on public.quiz_questions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy quiz_translations_public_read
  on public.quiz_question_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.quiz_questions q
      join public.relics r on r.id = q.relic_id
      where q.id = question_id and r.published = true
    )
  );

create policy quiz_translations_admin_all
  on public.quiz_question_translations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Privileges (RLS still applies)
-- ---------------------------------------------------------------------------

grant select on
  public.relics,
  public.relic_facts,
  public.relic_media,
  public.relic_translations,
  public.media_translations,
  public.quiz_questions,
  public.quiz_question_translations
to anon, authenticated;

grant select on public.admin_users to authenticated;

grant insert, update, delete on
  public.relics,
  public.relic_facts,
  public.relic_media,
  public.relic_translations,
  public.media_translations,
  public.quiz_questions,
  public.quiz_question_translations
to authenticated;

grant insert, update, delete on public.admin_users to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded images, videos and audio.
-- Public read (the museum is public); writes go through the server with the
-- secret key, so no client-side write policy is granted.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'relic-media',
  'relic-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
    'audio/ogg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
