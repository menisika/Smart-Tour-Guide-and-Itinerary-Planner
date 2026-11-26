# Design

The design of Promenade, made before the product is built ([work plan, track D](../docs/WORK-PLAN.md#d--design-stage-zero)). Everything here is a file that opens locally: nothing is hosted, and the pages load nothing from the network.

## Open it

```sh
pnpm design
```

Then open <http://localhost:4310/>, which is the design system. To hold a mockup in the hand, serve it to the local network and open the address it prints on a phone:

```sh
pnpm design --lan
```

| Page                                                    | What it is                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/system/`                                              | The design system (`D-02`): every token and component, the map, the icons, the mark, the motion studies and the accessibility rules. Its own [README](system/README.md) says how it is made.                                             |
| `/system/check.html`                                    | Draws every component in every system, theme, language and text size and measures it. It has to report nothing.                                                                                                                          |
| `/system/motion/…`                                      | The three motion studies, each alone.                                                                                                                                                                                                    |
| `/screens/`                                             | The screens (`D-03`): the scenarios of the specification as walks, and every screen in each of its states with the requirements it shows. Its own [README](screens/README.md) says how they are made and how the specification was read. |
| `/screens/check.html`                                   | Draws every screen in every state, system, theme and language and measures it. It has to report nothing.                                                                                                                                 |
| `/directions/`                                          | The two reference screens of `D-01` side by side, for one system, theme and language at a time. Since `D-02` they are assembled from the components of the system.                                                                       |
| `/directions/timetable.html`                            | The sheet of the chosen direction as the owner accepted it: its reasons, type, colours, map, motion, and all twenty-four drawings.                                                                                                       |
| `/directions/one.html#d=…&screen=…&os=…&theme=…&lang=…` | One screen at its real size. On a phone the outline of the device is dropped and the screen fills the width.                                                                                                                             |
| `/directions/check.html`                                | Draws every variant of the two screens and reports a control, a title or a line of text that leaves its screen or is cut.                                                                                                                |

The server is `serve.mjs`: a small file over Node's `http`. It serves this folder, answers a request for a range of bytes (the tile archive of the live map is read that way), and hands out MapLibre and the PMTiles reader from the repository's development dependencies under `/vendor/`. Everything but the live map opens from any static server pointed at this folder.

## What is here

```
brief.md             who the design is for, what it must never look like, the chosen direction and the rounds before it, licences
system/              the design system: tokens, components, the map style, icons, the mark, motion studies — see its README
data/
  outing.json        the reference Outing of scenario SC-1: every name, time and distance on the screens
  story.json         the passages shown while "a Story plays", quoted and cited
  photos.json        the photograph of each Place: file, author, licence, source
  map.json           the geometry of the drawn map, and the way round a skipped Place (generated)
  outing.pmtiles     the tiles of the Outing's area in the Protomaps schema, for the live map
assets/
  fonts/             the font files, each family with its licence
  glyphs/            the glyph ranges of the map's face, with its licence
  photos/            the photographs, scaled and without metadata
  samples.json       marked samples of states the reference Outing does not hold; never shown as measured
  venues.json        Venues near the Route, from OpenStreetMap, for the screen of a Break
directions/
  shared/            the page around the mockups, device outlines, the drawn map, the loading of data
  timetable/         the two reference screens of the chosen direction, arranged from the system's components
  index.html, one.html, check.html, timetable.html and their scripts
screens/             every screen, arranged from the system's components: a registry, the index, the check — see its README
tools/
  build-map.mjs      builds data/map.json from OpenStreetMap data
  build-system.mjs   writes what is generated from system/tokens.json (`pnpm design:build`)
  check-system.mjs   the checks of the design system (`pnpm lint:design`)
  outline-wordmark.py  draws the letters of the wordmark from the typeface
serve.mjs            the static server behind `pnpm design`
```

A screen is a function that arranges components of the system for a system, a theme and a language; it draws nothing of its own. The words exist once per language in `system/strings.js`; the numbers come from `data/`. Nothing is bundled; what is generated from the tokens is written by `pnpm design:build` and committed.

## The owner's acceptance of the screens

Recorded in full in the [screens' README](screens/README.md#the-owners-acceptance).

- **`D-03` — accepted on 25 November 2026.** The owner accepted the screens of the solo Outing on iOS and Android as they were shown, without asking for another round.

## Rules of the folder

- **A mockup shows real content.** Names, times and distances come from `data/outing.json`. Story text is a cited passage of an open source or is marked as sample text; no history is written for a mockup.
- **A city is data.** The city appears in `data/`, never in a script or a style sheet.
- **Everything shipped has a licence that allows it**, recorded in [the brief](brief.md#8-licences). A font is added as files under `assets/fonts/<family>/` with its licence text beside them, a `@font-face` rule in `system/css/fonts.css`, and a line in that table.
- **A map treatment uses only what a MapLibre style can express** ([ADR-0008](../docs/adr/0008-maps-openstreetmap-pmtiles-and-maplibre.md)): fills, fill patterns, lines with widths, casings and dashes, symbols, text along a line.
- **Pictographic characters are not icons.** Icons are drawn, in `system/icons.js`, each with its name in both languages.
- **Glass is the layer of controls over the content**, never the ground of text that is read; `system/css/materials.css` holds the material and its solid form for Android, for bright sunlight, for the saver mode and for "reduce transparency".
- **A colour, a size, a duration is a token.** It is written once, in `system/tokens.json`, and nowhere else.
- **A photograph is shown with its author and its licence**, taken from `data/photos.json`.

## Which checks of the repository apply

| Check                                                  | Applies to this folder                                                                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint:design`                                     | Yes, and only to it: contrast of every colour pair at WCAG 2.2 level AA, target sizes, the type scale, the names of icons, the map styles, and that generated files are current.              |
| `pnpm lint:format` (Prettier)                          | Yes: every Markdown, HTML, CSS, JavaScript and JSON file. What is generated — `data/map.json`, `system/tokens.css`, the map styles, the files of the mark — is left out in `.prettierignore`. |
| `pnpm lint:eslint`                                     | Yes: the scripts, with browser globals for `directions/`, `system/` and `screens/` (`eslint.config.mjs`).                                                                                     |
| `pnpm lint:plan`                                       | Yes, indirectly: the status of each design package in the work plan.                                                                                                                          |
| `pnpm lint:types`, `pnpm lint:boundaries`, `pnpm test` | No: there is no TypeScript and no test here. The scripts carry JSDoc types for the editor.                                                                                                    |
| The pre-commit and commit-message hooks                | Yes. The commit scope is `design`.                                                                                                                                                            |

Before a change is pushed, open `/system/check.html`, `/directions/check.html` and `/screens/check.html`: each has to report nothing. They are pages and not commands because they measure controls as a browser lays them out, and the repository has no browser among its tools.

What is still checked by eye: how a screen looks at the width of a phone and of a desktop, and the map style on real tiles (the live map on the system's page).

## Rebuilding the map

`data/map.json` is cut from the city data of the spike in [`spikes/minsk-city-data`](../spikes/minsk-city-data/README.md), whose downloads are not committed. With that spike run once (`npm install && npm run fetch && npm run all` in its folder):

```sh
node design/tools/build-map.mjs --spike spikes/minsk-city-data
```

It reads the Outing from `data/outing.json`, cuts the map around it, finds the walked line on the spike's pedestrian graph and prints the legs beside the measured ones. It also finds the way round the Place named in `study.skip_order`, which is what the Route becomes when that Place is skipped. Its output is the same on every run.

`data/outing.pmtiles` is the spike's `data/map/outing-z15.pmtiles`, copied as it is: the area of the Route Pack of the reference Outing, cut from the Protomaps build of 22 November 2026.
