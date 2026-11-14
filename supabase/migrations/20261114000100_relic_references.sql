-- ---------------------------------------------------------------------------
-- Official reference links and "extra" flag for the challenge catalogue
--
-- `reference_url` points at the mission page / NSSDC record that the Space Apps
-- challenge lists under Resources. `is_extra` marks museum-quality relics that
-- are not part of the official 13 categories (e.g. Voyager), so the UI can be
-- honest about the brief.
-- ---------------------------------------------------------------------------

alter table public.relics
  add column reference_url text,
  add column is_extra boolean not null default false;

alter table public.relics
  add constraint relics_reference_url_http
  check (
    reference_url is null
    or (reference_url ~ '^https?://' and length(reference_url) <= 2048)
  );
