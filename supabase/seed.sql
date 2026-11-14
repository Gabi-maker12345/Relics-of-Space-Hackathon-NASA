-- ---------------------------------------------------------------------------
-- Space Relics — demo seed (generated, idempotent)
--
-- Source of truth: data/relics.json
-- Regenerate with: npm run seed:generate
--
-- Safe to run repeatedly: the demo rows are deleted by slug and reinserted.
-- Admin edits to these relics are overwritten.
-- ---------------------------------------------------------------------------

begin;

-- Remove the demo rows (cascades to facts, media and translations).
delete from public.relics
where slug in (
  'apollo-lunar-module',
  'opportunity',
  'viking-1',
  'spirit',
  'sojourner',
  'ingenuity',
  'apollo-lunar-roving-vehicle',
  'surveyor-3',
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11'
);

insert into public.relics
  (id, slug, name, mission, summary, story_text, status, location, published, alt, ratio, reference_url, is_extra)
values
  ('00000000-0000-4000-8000-000000000001', 'apollo-lunar-module', 'Módulo Lunar Apollo', 'Apollo 11–17 · 1969–1972', 'Seis pousos, seis módulos deixados para trás.', 'O estágio de descida do módulo lunar nunca voltou para casa: ficou na superfície depois de servir de plataforma de lançamento para o estágio de subida. Seis deles continuam onde pousaram, do Mar da Tranquilidade a Taurus-Littrow — os únicos veículos tripulados que a humanidade deixou em outro mundo.', 'silent', 'moon', true, 'Módulo lunar Apollo 11 na superfície da Lua, com o estágio de descida dourado e as pernas de pouso', '16 / 9', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C', false),
  ('00000000-0000-4000-8000-000000000002', 'opportunity', 'Opportunity', 'Mars Exploration Rover · 2004–2018', 'Uma maratona de 45 km em outro mundo.', 'Pousou em Meridiani Planum em janeiro de 2004, contratado para 90 dias. Encontrou provas de água líquida no passado, percorreu 45,16 km — mais do que qualquer outro veículo em outro planeta — e ficou em silêncio quando uma tempestade de poeira cobriu o Sol, em junho de 2018.', 'lost', 'mars', true, 'Autorretrato do rover Opportunity em Marte, com os painéis solares cobertos de poeira', '16 / 9', 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/', false),
  ('00000000-0000-4000-8000-000000000003', 'viking-1', 'Viking 1', 'Viking · 1976–1982', 'A primeira nave a trabalhar em Marte.', 'Pousou em Chryse Planitia a 20 de julho de 1976 e operou durante seis anos, enviando as primeiras imagens da superfície marciana e procurando sinais de vida. Continua em Marte, em silêncio desde 1982.', 'lost', 'mars', true, 'Modelo em escala do lander Viking 1 sobre uma superfície marciana simulada', '16 / 9', 'https://science.nasa.gov/mission/viking-1/', false),
  ('00000000-0000-4000-8000-000000000004', 'spirit', 'Spirit', 'Mars Exploration Rover · 2004–2010', 'O gémeo que ficou preso na areia e continuou a fazer ciência.', 'Pousou em Gusev Crater a 4 de janeiro de 2004, três semanas antes do Opportunity. Encontrou provas de que a cratera já teve água e subiu as Columbia Hills. Em 2009 ficou preso em areia solta; continuou a trabalhar como estação fixa até perder o contacto, a 22 de março de 2010.', 'lost', 'mars', true, 'Ilustração do rover Spirit nas Columbia Hills, em Marte', '16 / 9', 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/', false),
  ('00000000-0000-4000-8000-000000000005', 'sojourner', 'Sojourner', 'Mars Pathfinder · 1997', 'O primeiro rover a rodar noutro planeta.', 'Chegou a Marte a 4 de julho de 1997, dentro da missão Pathfinder. Com 10,6 kg, percorreu cerca de 100 metros em 83 sols, tirou imagens da superfície e analisou rochas. O último contacto foi a 27 de setembro de 1997.', 'lost', 'mars', true, 'Rover Sojourner recém-implantado na superfície de Marte', '16 / 9', 'https://science.nasa.gov/mission/mars-pathfinder/', false),
  ('00000000-0000-4000-8000-000000000006', 'ingenuity', 'Ingenuity', 'Mars 2020 · 2021–2024', 'O primeiro helicóptero a voar noutro mundo.', 'Chegou a Marte com a Perseverance em fevereiro de 2021. O primeiro voo, a 19 de abril de 2021, foi o primeiro voo motorizado e controlado noutro planeta. Planeado para cinco voos, fez 72 e acumulou quase 129 minutos no ar. O último voo, em janeiro de 2024, danificou uma pá do rotor.', 'silent', 'mars', true, 'Ilustração do helicóptero Ingenuity na superfície de Marte', '16 / 9', 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/', false),
  ('00000000-0000-4000-8000-000000000007', 'apollo-lunar-roving-vehicle', 'Rover Lunar Apollo', 'Apollo 15–17 · 1971–1972', 'O carro que levou astronautas a quilómetros do módulo lunar.', 'Três rovers lunares foram usados nas últimas missões Apollo. Dobravam-se para caber no módulo lunar e eram movidos por baterias. Em conjunto, percorreram cerca de 90 km e permitiram aos astronautas explorar terrenos a vários quilómetros do local de pouso. Os três continuam na Lua.', 'silent', 'moon', true, 'Rover lunar Apollo 15 sozinho na superfície da Lua', '16 / 9', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C', false),
  ('00000000-0000-4000-8000-000000000008', 'surveyor-3', 'Surveyor 3', 'Surveyor · 1967', 'O lander que os astronautas do Apollo 12 visitaram.', 'Pousou em Oceanus Procellarum a 20 de abril de 1967, na terceira de sete missões Surveyor. Quase três anos depois, a tripulação do Apollo 12 pousou a cerca de 180 metros e visitou o lander, recolhendo componentes para análise. O Surveyor 3 continua na Lua.', 'silent', 'moon', true, 'Lander Surveyor 3 na cratera em que pousou, visto durante a missão Apollo 12', '16 / 9', 'https://science.nasa.gov/mission/surveyor-3/', false),
  ('00000000-0000-4000-8000-000000000009', 'voyager-1', 'Voyager 1', 'Voyager · 1977–presente', 'O objeto humano mais distante.', 'Lançada a 5 de setembro de 1977, passou por Júpiter em 1979 e por Saturno em 1980. Em 2012 tornou-se a primeira nave a entrar no espaço interestelar. Leva a bordo o Disco de Ouro, com sons e imagens da Terra, e continua a afastar-se a mais de 24 mil milhões de quilómetros.', 'active', 'deep_space', true, 'Ilustração da Voyager 1 com a antena apontada para a Terra', '16 / 9', 'https://science.nasa.gov/mission/voyager/', true),
  ('00000000-0000-4000-8000-000000000010', 'voyager-2', 'Voyager 2', 'Voyager · 1977–presente', 'A única nave a visitar os quatro gigantes gasosos.', 'Lançada a 20 de agosto de 1977, passou por Júpiter em 1979, Saturno em 1981, Urano em 1986 e Neptuno em 1989. É a única nave a visitar os quatro gigantes gasosos e entrou no espaço interestelar em novembro de 2018. Continua a comunicar com a Terra.', 'active', 'deep_space', true, 'Fotografia da Voyager 2 numa sala limpa do JPL, em 1977', '16 / 9', 'https://science.nasa.gov/mission/voyager/', true),
  ('00000000-0000-4000-8000-000000000011', 'pioneer-10', 'Pioneer 10', 'Pioneer · 1972–2003', 'A primeira nave a atravessar o cinturão de asteroides e a chegar a Júpiter.', 'Lançada a 2 de março de 1972, foi a primeira nave a atravessar o cinturão de asteroides e a primeira a sobrevoar Júpiter, em dezembro de 1973. Levava uma placa gravada com a figura de um homem e de uma mulher, um mapa da Terra e a posição do Sol. O último sinal chegou a 23 de janeiro de 2003.', 'lost', 'deep_space', true, 'Ilustração da Pioneer 10 a passar por Júpiter, por Rick Guidice', '16 / 9', 'https://science.nasa.gov/mission/pioneer-10/', false),
  ('00000000-0000-4000-8000-000000000012', 'pioneer-11', 'Pioneer 11', 'Pioneer · 1973–1995', 'A primeira nave a visitar Saturno.', 'Lançada a 5 de abril de 1973, passou por Júpiter em dezembro de 1974 e tornou-se a primeira nave a sobrevoar Saturno, em setembro de 1979. Seguiu depois para o espaço interestelar. O último contacto foi a 30 de setembro de 1995.', 'lost', 'deep_space', true, 'Ilustração da Pioneer 11 a passar por Saturno, por Wilson Hurley', '16 / 9', 'https://science.nasa.gov/mission/pioneer-10/', false);

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
  ('00000000-0000-4000-8000-000000000003', 'Último contacto', '11 nov 1982', 3),
  ('00000000-0000-4000-8000-000000000004', 'Pouso', '4 jan 2004', 0),
  ('00000000-0000-4000-8000-000000000004', 'Distância', '7,73 km', 1),
  ('00000000-0000-4000-8000-000000000004', 'Columbia Hills', '2004–2009', 2),
  ('00000000-0000-4000-8000-000000000004', 'Último sinal', '22 mar 2010', 3),
  ('00000000-0000-4000-8000-000000000005', 'Pouso', '4 jul 1997', 0),
  ('00000000-0000-4000-8000-000000000005', 'Massa', '10,6 kg', 1),
  ('00000000-0000-4000-8000-000000000005', 'Distância', '~100 m', 2),
  ('00000000-0000-4000-8000-000000000005', 'Último sinal', '27 set 1997', 3),
  ('00000000-0000-4000-8000-000000000006', 'Primeiro voo', '19 abr 2021', 0),
  ('00000000-0000-4000-8000-000000000006', 'Voos', '72', 1),
  ('00000000-0000-4000-8000-000000000006', 'Tempo no ar', '~129 min', 2),
  ('00000000-0000-4000-8000-000000000006', 'Último voo', '18 jan 2024', 3),
  ('00000000-0000-4000-8000-000000000007', 'Missões', '3 (Apollo 15–17)', 0),
  ('00000000-0000-4000-8000-000000000007', 'Distância total', '~90 km', 1),
  ('00000000-0000-4000-8000-000000000007', 'Massa', '210 kg', 2),
  ('00000000-0000-4000-8000-000000000007', 'Última utilização', 'dez 1972', 3),
  ('00000000-0000-4000-8000-000000000008', 'Pouso', '20 abr 1967', 0),
  ('00000000-0000-4000-8000-000000000008', 'Local', 'Oceanus Procellarum', 1),
  ('00000000-0000-4000-8000-000000000008', 'Visita', 'Apollo 12 · nov 1969', 2),
  ('00000000-0000-4000-8000-000000000008', 'Massa', '~300 kg', 3),
  ('00000000-0000-4000-8000-000000000009', 'Lançamento', '5 set 1977', 0),
  ('00000000-0000-4000-8000-000000000009', 'Júpiter', '1979', 1),
  ('00000000-0000-4000-8000-000000000009', 'Saturno', '1980', 2),
  ('00000000-0000-4000-8000-000000000009', 'Espaço interestelar', '2012', 3),
  ('00000000-0000-4000-8000-000000000010', 'Lançamento', '20 ago 1977', 0),
  ('00000000-0000-4000-8000-000000000010', 'Gigantes visitados', '4', 1),
  ('00000000-0000-4000-8000-000000000010', 'Urano', '1986', 2),
  ('00000000-0000-4000-8000-000000000010', 'Espaço interestelar', '2018', 3),
  ('00000000-0000-4000-8000-000000000011', 'Lançamento', '2 mar 1972', 0),
  ('00000000-0000-4000-8000-000000000011', 'Júpiter', 'dez 1973', 1),
  ('00000000-0000-4000-8000-000000000011', 'Placa gravada', '1972', 2),
  ('00000000-0000-4000-8000-000000000011', 'Último sinal', '23 jan 2003', 3),
  ('00000000-0000-4000-8000-000000000012', 'Lançamento', '5 abr 1973', 0),
  ('00000000-0000-4000-8000-000000000012', 'Júpiter', '1974', 1),
  ('00000000-0000-4000-8000-000000000012', 'Saturno', '1979', 2),
  ('00000000-0000-4000-8000-000000000012', 'Último sinal', '30 set 1995', 3);

insert into public.relic_media
  (id, relic_id, type, url, poster_url, kicker, title, caption, credit, source_url, position)
values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', 'image', '/images/relics/apollo-lunar-module-1.jpg', null, 'Fotografia', 'O Águia na superfície', 'O estágio de descida do Águia, fotografado por Neil Armstrong a 20 de julho de 1969. A película dourada é isolamento térmico; as pernas continuam apoiadas no regolito.', 'NASA / JSC', 'https://images.nasa.gov/details/as11-40-5927', 0),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', 'image', '/images/relics/apollo-lunar-module-2.jpg', null, 'Fotografia', 'O reflexo do Águia', 'Buzz Aldrin junto ao módulo lunar. No visor do capacete refletem-se o próprio Águia e o fotógrafo, Neil Armstrong.', 'NASA / JSC', 'https://images.nasa.gov/details/as11-40-5903', 1),
  ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000002', 'image', '/images/relics/opportunity-1.jpg', null, 'Fotografia', 'Autorretrato em Perseverance Valley', 'Mosaico de imagens tirado pelo próprio rover em janeiro de 2014. A poeira cobre os painéis solares; o mastro da câmara ergue-se acima do corpo.', 'NASA/JPL-Caltech/Cornell Univ./Arizona State Univ.', 'https://images.nasa.gov/details/PIA17759', 0),
  ('00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000000002', 'image', '/images/relics/opportunity-2.jpg', null, 'Registo orbital', 'A cratera Endeavour', 'Vista orbital do caminho percorrido pelo Opportunity na borda da cratera Endeavour, o destino final da maratona de 45 km. A linha clara é a rota do rover.', 'NASA/JPL-Caltech/University of Arizona', 'https://images.nasa.gov/details/PIA14537', 1),
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000003', 'image', '/images/relics/viking-1-1.jpg', null, 'Modelo', 'O lander Viking 1', 'Modelo em escala do lander, fotografado no laboratório. O corpo hexagonal, os três painéis solares e a antena de alto ganho foram projetados para sobreviver ao pouso e operar durante anos.', 'NASA/JPL-Caltech/University of Arizona', 'https://images.nasa.gov/details/PIA09703', 0),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000003', 'image', '/images/relics/viking-1-2.jpg', null, 'Panorama', 'O primeiro panorama de Marte', 'Primeira vista panorâmica da superfície marciana, enviada pelo Viking 1 em julho de 1976. O solo é coberto de rochas e o céu tem a cor da poeira em suspensão.', 'NASA/JPL', 'https://images.nasa.gov/details/PIA00383', 1),
  ('00000000-0000-4000-8000-000000004001', '00000000-0000-4000-8000-000000000004', 'image', '/images/relics/spirit-1.jpg', null, 'Ilustração', 'Spirit nas Columbia Hills', 'Imagem produzida com a tecnologia Virtual Presence in Space, da NASA, para mostrar o rover no terreno acidentado das Columbia Hills.', 'NASA/JPL-Solar System Visualization Team', 'https://images.nasa.gov/details/PIA03230', 0),
  ('00000000-0000-4000-8000-000000004002', '00000000-0000-4000-8000-000000000004', 'image', '/images/relics/spirit-2.jpg', null, 'Registo orbital', 'O Spirit visto de cima', 'A câmara do Mars Global Surveyor encontrou o Spirit em janeiro de 2004: o ponto claro no centro é o rover, com as marcas do pouso à volta.', 'NASA/JPL/Malin Space Science Systems', 'https://images.nasa.gov/details/PIA05248', 1),
  ('00000000-0000-4000-8000-000000005001', '00000000-0000-4000-8000-000000000005', 'image', '/images/relics/sojourner-1.jpg', null, 'Fotografia', 'Sojourner em Ares Vallis', 'O rover de 10,6 kg depois de descer da Pathfinder. As rodas e o painel solar plano foram desenhados para um veículo do tamanho de um micro-ondas.', 'NASA/JPL', 'https://images.nasa.gov/details/PIA01551', 0),
  ('00000000-0000-4000-8000-000000005002', '00000000-0000-4000-8000-000000000005', 'image', '/images/relics/sojourner-2.jpg', null, 'Fotografia', 'Três gerações de rovers', 'Sojourner posa ao lado dos gémeos Spirit e Opportunity no laboratório do JPL, em 2003. O pequeno antepassado abriu o caminho aos rover marcianos que se seguiram.', 'NASA/JPL', 'https://images.nasa.gov/details/PIA04422', 1),
  ('00000000-0000-4000-8000-000000006001', '00000000-0000-4000-8000-000000000006', 'image', '/images/relics/ingenuity-1.jpg', null, 'Ilustração', 'Ingenuity em Marte', 'Conceito artístico do helicóptero de 1,8 kg na superfície marciana, com a Perseverance parcialmente visível ao fundo.', 'NASA/JPL-Caltech', 'https://images.nasa.gov/details/PIA23720', 0),
  ('00000000-0000-4000-8000-000000006002', '00000000-0000-4000-8000-000000000006', 'image', '/images/relics/ingenuity-2.jpg', null, 'Registo aéreo', 'A primeira imagem aérea a cores', 'Imagem captada pelo Ingenuity enquanto voava, a 22 de abril de 2021: a primeira fotografia aérea a cores da superfície de Marte.', 'NASA/JPL-Caltech', 'https://images.nasa.gov/details/PIA24593', 1),
  ('00000000-0000-4000-8000-000000007001', '00000000-0000-4000-8000-000000000007', 'image', '/images/relics/apollo-lunar-roving-vehicle-1.jpg', null, 'Fotografia', 'O LRV sozinho', 'O rover lunar do Apollo 15 fotografado contra a paisagem lunar durante a terceira caminhada espacial. As rodas independentes e o assento duplo permitiam explorar a superfície em segurança.', 'NASA / JSC', 'https://images.nasa.gov/details/as15-88-11901', 0),
  ('00000000-0000-4000-8000-000000007002', '00000000-0000-4000-8000-000000000007', 'image', '/images/relics/apollo-lunar-roving-vehicle-2.jpg', null, 'Fotografia', 'James Irwin ao volante', 'O astronauta James Irwin trabalha junto ao rover durante a primeira EVA do Apollo 15, em julho de 1971.', 'NASA / JSC', 'https://images.nasa.gov/details/as15-86-11603', 1),
  ('00000000-0000-4000-8000-000000008001', '00000000-0000-4000-8000-000000000008', 'image', '/images/relics/surveyor-3-1.jpg', null, 'Fotografia', 'Surveyor 3 na cratera', 'O lander Surveyor 3 fotografado pela tripulação do Apollo 12 em novembro de 1969, na cratera em que pousou dois anos e meio antes.', 'NASA / JSC', 'https://images.nasa.gov/details/as12-48-7121', 0),
  ('00000000-0000-4000-8000-000000008002', '00000000-0000-4000-8000-000000000008', 'image', '/images/relics/surveyor-3-2.jpg', null, 'Fotografia', 'Dois veículos na Lua', 'O astronauta Alan Bean junto ao Surveyor 3, com o módulo lunar Intrepid ao fundo. A Apollo 12 recolheu peças do lander para estudar os efeitos do ambiente lunar.', 'NASA / JSC', 'https://images.nasa.gov/details/AS12-48-7133', 1),
  ('00000000-0000-4000-8000-000000009001', '00000000-0000-4000-8000-000000000009', 'image', '/images/relics/voyager-1-1.jpg', null, 'Ilustração', 'A Voyager 1', 'Conceito artístico da nave com a antena de alto ganho apontada para a Terra. A Voyager 1 é o objeto construído pelo homem que está mais longe do planeta.', 'NASA/JPL', 'https://images.nasa.gov/details/PIA04495', 0),
  ('00000000-0000-4000-8000-000000009002', '00000000-0000-4000-8000-000000000009', 'image', '/images/relics/voyager-1-2.jpg', null, 'Fotografia', 'O Disco de Ouro', 'Técnicos preparam o Disco de Ouro para ser instalado na Voyager 1, em 1977. O disco contém saudações em 55 línguas, música e imagens da Terra.', 'NASA/JPL-Caltech', 'https://images.nasa.gov/details/PIA21741', 1),
  ('00000000-0000-4000-8000-000000010001', '00000000-0000-4000-8000-000000000010', 'image', '/images/relics/voyager-2-1.jpg', null, 'Fotografia', 'A Voyager 2 no laboratório', 'Engenheiros trabalham na Voyager 2 numa sala limpa do JPL, em março de 1977. A nave foi lançada cinco meses depois.', 'NASA/JPL-Caltech', 'https://images.nasa.gov/details/PIA21736', 0),
  ('00000000-0000-4000-8000-000000010002', '00000000-0000-4000-8000-000000000010', 'image', '/images/relics/voyager-2-2.jpg', null, 'Registo', 'Urano visto pela Voyager 2', 'Imagem de Urano obtida pela Voyager 2 em 1986. A nave revelou um mundo gelado, com anéis ténues e uma inclinação extrema.', 'NASA/JPL-Caltech', 'https://images.nasa.gov/details/PIA18182', 1),
  ('00000000-0000-4000-8000-000000011001', '00000000-0000-4000-8000-000000000011', 'image', '/images/relics/pioneer-10-1.jpg', null, 'Ilustração', 'Pioneer 10 em Júpiter', 'Ilustração de Rick Guidice para a NASA: a Pioneer 10 passa por Júpiter em dezembro de 1973, a primeira nave a chegar ao planeta.', 'NASA/Ames Research Center · Rick Guidice', 'https://images.nasa.gov/details/ARC-1973-AC73-4247', 0),
  ('00000000-0000-4000-8000-000000011002', '00000000-0000-4000-8000-000000000011', 'image', '/images/relics/pioneer-10-2.jpg', null, 'Ilustração', 'A caminho do espaço interestelar', 'Pintura de Don Moore usada numa animação sobre a missão Pioneer. A nave levava a bordo a placa com a localização da Terra.', 'NASA/Ames Research Center · Don Moore', 'https://images.nasa.gov/details/ARC-1969-AC72-1353', 1),
  ('00000000-0000-4000-8000-000000012001', '00000000-0000-4000-8000-000000000012', 'image', '/images/relics/pioneer-11-1.jpg', null, 'Ilustração', 'Pioneer 11 em Saturno', 'Pintura de Wilson Hurley para a NASA: a Pioneer 11 aproxima-se de Saturno em 1979, antes do primeiro sobrevoo da nave pelo planeta.', 'NASA/Ames Research Center · Wilson Hurley', 'https://images.nasa.gov/details/ARC-2000-80-HC-251', 0),
  ('00000000-0000-4000-8000-000000012002', '00000000-0000-4000-8000-000000000012', 'image', '/images/relics/pioneer-11-2.jpg', null, 'Ilustração', 'A família Pioneer', 'Composição de Fornalski com as sondas Pioneer 6 a 11. A Pioneer 11 foi a primeira a visitar Saturno e a segunda a deixar o sistema solar.', 'NASA/Ames Research Center · Fornalski', 'https://images.nasa.gov/details/ARC-1982-AC82-0178', 1);

-- The first media item of each relic is its cover.
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000001001' where id = '00000000-0000-4000-8000-000000000001';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000002001' where id = '00000000-0000-4000-8000-000000000002';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000003001' where id = '00000000-0000-4000-8000-000000000003';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000004001' where id = '00000000-0000-4000-8000-000000000004';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000005001' where id = '00000000-0000-4000-8000-000000000005';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000006001' where id = '00000000-0000-4000-8000-000000000006';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000007001' where id = '00000000-0000-4000-8000-000000000007';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000008001' where id = '00000000-0000-4000-8000-000000000008';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000009001' where id = '00000000-0000-4000-8000-000000000009';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000010001' where id = '00000000-0000-4000-8000-000000000010';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000011001' where id = '00000000-0000-4000-8000-000000000011';
update public.relics set cover_media_id = '00000000-0000-4000-8000-000000012001' where id = '00000000-0000-4000-8000-000000000012';

commit;
