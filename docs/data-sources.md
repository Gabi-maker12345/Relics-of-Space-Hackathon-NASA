# Fontes de dados e conformidade

Este documento regista de onde vem cada coisa que o site mostra, para a demo e
para a entrega do Space Apps 2026. A regra é simples: **nada de mídia inventada
a passar por arquivo oficial**; quando é ilustração, modelo ou imagem orbital,
o `kicker` e o crédito dizem isso.

## 1. Resources oficiais do desafio

A página do desafio lista **13 categorias** de resources (algumas agrupam duas
naves). Extraímo-las da página oficial e usámo-las como `reference_url`:

| # | Categoria oficial | Link oficial | Relíquia(s) nossa(s) | Estado |
|---|---|---|---|---|
| 1 | Apollo Lunar Modules | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C | `apollo-lunar-module` | ✅ |
| 2 | Lunar Roving Vehicles | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C | `apollo-lunar-roving-vehicle` | ✅ |
| 3 | ALSEP Scientific Packages | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C | — | ❌ |
| 4 | Surveyor Landers | https://science.nasa.gov/mission/surveyor-3/ | `surveyor-3` | ✅ |
| 5 | Sojourner Rover | https://science.nasa.gov/mission/mars-pathfinder/ | `sojourner` | ✅ |
| 6 | Spirit & Opportunity | https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/ | `spirit`, `opportunity` | ✅ |
| 7 | Viking 1 & 2 Landers | https://science.nasa.gov/mission/viking-1/ | `viking-1` | ⚠️ falta Viking 2 |
| 8 | Phoenix & InSight Landers | https://science.nasa.gov/mission/insight/ | — | ❌ |
| 9 | Dawn Spacecraft | https://science.nasa.gov/mission/dawn/ | — | ❌ |
| 10 | NEAR Shoemaker | https://science.nasa.gov/mission/near-shoemaker/ | — | ❌ |
| 11 | Pioneer 10 & 11 | https://science.nasa.gov/mission/pioneer-10/ | `pioneer-10`, `pioneer-11` | ✅ |
| 12 | Ingenuity Helicopter | https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/ | `ingenuity` | ✅ |
| 13 | Kepler Space Telescope | https://science.nasa.gov/mission/kepler/ | — | ❌ |

**Extras (fora da lista oficial, marcados com `is_extra = true`):**

| Relíquia | Link | Nota |
|---|---|---|
| `voyager-1` | https://science.nasa.gov/mission/voyager/ | NASA, mas não está nos resources |
| `voyager-2` | https://science.nasa.gov/mission/voyager/ | NASA, mas não está nos resources |

O `Lunokhod 1` foi removido: é soviético e o brief é sobre equipamento NASA.

## 2. Mídia

- **24 imagens**, todas obtidas em `https://images.nasa.gov`.
- No seed, cada `relic_media.url` e cada `audio_url`/`intro_audio_url` é um
  **URL absoluto do Storage** (`relic-media/assets/...`). O ficheiro original
  vive em `public/`, mas o browser em produção lê do bucket; `npm run media:upload`
  é idempotente e garante que o bucket tem os 71 ficheiros.
- Cada linha de `relic_media` tem:
  - `credit` (ex.: `NASA/JPL-Caltech`, `NASA / JSC`, `NASA/GSFC/Arizona State University`, `NASA/Ames Research Center · Rick Guidice`);
  - `source_url` = `https://images.nasa.gov/details/<nasa_id>`;
  - `kicker` = `Fotografia`, `Ilustração`, `Modelo`, `Registo orbital`, etc.
- **Ilustrações e modelos** são identificados como tal. Exemplos:
  - Spirit em Columbia Hills: ilustração `PIA03230`;
  - Viking 1: modelo `PIA09703`;
  - Pioneer 10/11: pinturas de Rick Guidice, Don Moore, Wilson Hurley e Fornalski (Ames).
- **Não há vídeos** no seed atual. A importação NASA (BE-11) suporta vídeos e
  guarda `url`, `poster_url`, `credit` e `source_url`.
- **Áudio:** não é áudio NASA. É narração sintética gerada com **Edge TTS**
  (`pt-PT-RaquelNeural`) a partir dos nossos textos PT. Fica em
  `public/media/narration/` e é identificável como síntese no README/deploy.

## 3. Textos

- Os resumos, histórias e factos são **nossos, em português**, escritos a partir
  das páginas oficiais. Não são uma cópia literal da NASA.
- Quando um facto é incerto, usa-se uma formulação conservadora (ex.: `~300 kg`,
  `~90 km`).
- Traduções EN ainda não existem; o `?lang=en` faz fallback para PT.

## 4. Regras de uso de mídia NASA

Fonte: [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

Resumo aplicável ao projeto:

- O conteúdo NASA **geralmente não está sujeito a copyright nos EUA**.
- Pode ser usado para fins **educacionais/informativos**, incluindo sites.
- A NASA deve ser **creditada como fonte**.
- Não pode ser usado para **implicar endosso** da NASA.
- A NASA usa, por vezes, material de terceiros com copyright; esses casos têm de
  ser creditados e tratados junto do titular. No nosso seed, as pinturas de Ames
  estão creditadas aos artistas.
- O logótipo/insígnia NASA é uma marca; para o deploy público, acrescentar um
  aviso claro: **“Projeto independente, não afiliado nem endossado pela NASA.”**

## 5. Como atualizar

1. Adicionar/editar a relíquia em `data/relics.json` com `reference_url`.
2. Para cada mídia, preencher `credit` e `source_url` oficiais.
3. Correr `npm run seed:generate`.
4. Se houver texto novo, correr `npm run narration:generate` (Edge TTS) e
   `npm run narration:check`.
5. Atualizar este documento se a categoria oficial ou o estado mudar.
