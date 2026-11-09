-- ---------------------------------------------------------------------------
-- Space Relics — demo seed (idempotent)
--
-- Safe to run repeatedly: relics are upserted by slug and their facts/media
-- are replaced. Admin edits to these three demo relics will be overwritten.
-- Media URLs point at the assets bundled with the front end.
-- ---------------------------------------------------------------------------

begin;

insert into public.relics
  (id, slug, name, mission, summary, story_text, status, location, published, alt, ratio)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'apollo-lunar-module',
    'Módulo Lunar Apollo',
    'Apollo 11–17 · 1969–1972',
    'Seis pousos, seis módulos deixados para trás.',
    'O estágio de descida do módulo lunar nunca voltou para casa: ficou na superfície depois de servir de plataforma de lançamento para o estágio de subida. Seis deles continuam onde pousaram, do Mar da Tranquilidade a Taurus-Littrow.',
    'silent',
    'moon',
    true,
    'Módulo lunar Apollo em exposição, com o estágio de descida dourado e as pernas de pouso',
    '1376 / 768'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'opportunity',
    'Opportunity',
    'Mars Exploration Rover · 2004–2018',
    'Uma maratona de 45 km em outro mundo.',
    'Pousou em Meridiani Planum em janeiro de 2004, contratado para 90 dias. Encontrou provas de água líquida no passado, percorreu 45,16 km — mais do que qualquer outro veículo em outro planeta — e ficou em silêncio quando uma tempestade de poeira cobriu o Sol, em junho de 2018.',
    'silent',
    'mars',
    true,
    'Rover Opportunity em Marte, com painéis solares cobertos de poeira e o mastro da câmara erguido',
    '1408 / 768'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'viking-1',
    'Viking 1',
    'Viking · 1976–1982',
    'A primeira nave a trabalhar em Marte.',
    'Pousou em Chryse Planitia a 20 de julho de 1976 e operou durante seis anos, enviando as primeiras imagens da superfície marciana e procurando sinais de vida. Continua em Marte, em silêncio desde 1982.',
    'silent',
    'mars',
    true,
    'Lander Viking 1 com o corpo hexagonal, os três painéis solares e a antena de alto ganho',
    '1376 / 768'
  )
on conflict (slug) do update set
  name = excluded.name,
  mission = excluded.mission,
  summary = excluded.summary,
  story_text = excluded.story_text,
  status = excluded.status,
  location = excluded.location,
  published = excluded.published,
  alt = excluded.alt,
  ratio = excluded.ratio;

-- Replace the fact sheets of the demo relics.
delete from public.relic_facts
where relic_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003'
);

insert into public.relic_facts (relic_id, label, value, position)
values
  ('00000000-0000-4000-8000-000000000001', 'Primeiro pouso', '20 jul 1969', 0),
  ('00000000-0000-4000-8000-000000000001', 'Massa (descida)', '~10 t', 1),
  ('00000000-0000-4000-8000-000000000001', 'Locais', '6 na Lua', 2),
  ('00000000-0000-4000-8000-000000000001', 'Última visita', 'dez 1972', 3),
  ('00000000-0000-4000-8000-000000000002', 'Pouso', '25 jan 2004', 0),
  ('00000000-0000-4000-8000-000000000002', 'Distância', '45,16 km', 1),
  ('00000000-0000-4000-8000-000000000002', 'Tempo ativo', '14 anos', 2),
  ('00000000-0000-4000-8000-000000000002', 'Último sinal', '10 jun 2018', 3),
  ('00000000-0000-4000-8000-000000000003', 'Pouso', '20 jul 1976', 0),
  ('00000000-0000-4000-8000-000000000003', 'Operação', '6 anos', 1),
  ('00000000-0000-4000-8000-000000000003', 'Marco', '1.ª missão a operar em Marte', 2),
  ('00000000-0000-4000-8000-000000000003', 'Último contato', '11 nov 1982', 3);

-- Replace the media of the demo relics.
delete from public.relic_media
where relic_id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003'
);

insert into public.relic_media
  (id, relic_id, type, url, poster_url, kicker, title, caption, credit, source_url, position)
values
  (
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000001',
    'image',
    '/images/relics/apollo-lunar-module.jpg',
    null,
    'Fotografia',
    'Módulo Lunar Apollo',
    'O estágio de descida ficou na superfície depois de servir de plataforma de lançamento para o estágio de subida. Seis bases continuam onde pousaram, entre o Mar da Tranquilidade e Taurus-Littrow.',
    'NASA',
    null,
    0
  ),
  (
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000000001',
    'video',
    '/media/apollo-loop.mp4',
    '/images/relics/apollo-lunar-module.jpg',
    'Transmissão',
    'Regresso à Lua',
    'O que sobrou são seis bases, seis bandeiras e instrumentos que ainda refletem lasers disparados da Terra — a única presença humana permanente fora do planeta.',
    'NASA',
    null,
    1
  ),
  (
    '00000000-0000-4000-8000-000000002001',
    '00000000-0000-4000-8000-000000000002',
    'image',
    '/images/relics/opportunity.jpg',
    null,
    'Fotografia',
    'Opportunity em Meridiani Planum',
    'Pousou em Meridiani Planum em janeiro de 2004, contratado para 90 dias. Encontrou provas de água líquida, percorreu 45,16 km e ficou em silêncio quando uma tempestade de poeira cobriu o Sol, em junho de 2018.',
    'NASA',
    null,
    0
  ),
  (
    '00000000-0000-4000-8000-000000002002',
    '00000000-0000-4000-8000-000000000002',
    'video',
    '/media/relic-loop.mp4',
    '/images/relics/opportunity.jpg',
    'Transmissão',
    'Último sinal',
    'A NASA tentou chamá-lo mais de mil vezes depois da tempestade. O veículo continua no vale Perseverance, na borda da cratera Endeavour, a 45 quilómetros do ponto onde tudo começou.',
    'NASA',
    null,
    1
  ),
  (
    '00000000-0000-4000-8000-000000003001',
    '00000000-0000-4000-8000-000000000003',
    'image',
    '/images/relics/viking-1.jpg',
    null,
    'Fotografia',
    'Lander Viking 1',
    'Pousou em Chryse Planitia a 20 de julho de 1976 e operou durante seis anos, enviando as primeiras imagens da superfície marciana e procurando sinais de vida.',
    'NASA',
    null,
    0
  ),
  (
    '00000000-0000-4000-8000-000000003002',
    '00000000-0000-4000-8000-000000000003',
    'video',
    '/media/viking-loop.mp4',
    '/images/relics/viking-1.jpg',
    'Transmissão',
    'Seis anos em Marte',
    'As suas imagens e dados abriram caminho a todas as missões que se seguiram. Continua em Marte, em silêncio desde 1982.',
    'NASA',
    null,
    1
  );

update public.relics set cover_media_id = '00000000-0000-4000-8000-000000001001'
where id = '00000000-0000-4000-8000-000000000001';

update public.relics set cover_media_id = '00000000-0000-4000-8000-000000002001'
where id = '00000000-0000-4000-8000-000000000002';

update public.relics set cover_media_id = '00000000-0000-4000-8000-000000003001'
where id = '00000000-0000-4000-8000-000000000003';

commit;
