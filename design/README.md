# Design

The design of Promenade, made before the product is built ([work plan, track D](../docs/WORK-PLAN.md#d--design-stage-zero)). Everything here is a file that opens locally: nothing is hosted, and the pages load nothing from the network.

## Open it

```sh
pnpm design
```

Then open <http://localhost:4310/>. To hold a mockup in the hand, serve it to the local network and open the address it prints on a phone:

```sh
pnpm design --lan
```

| Page                                                            | What it is                                                                                                                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/directions/`                                                  | The three directions side by side: one screen, system, theme and language at a time, chosen with the switches. The choice is kept in the address, so a view can be sent as a link. |
| `/directions/guidebook.html`, `timetable.html`, `playbill.html` | The sheet of a direction: its reasons, type, colours with their contrast, map, motion, and all twenty-four drawings.                                                               |
| `/directions/one.html#d=…&screen=…&os=…&theme=…&lang=…`         | One screen at its real size. On a phone the outline of the device is dropped and the screen fills the width.                                                                       |
| `/directions/check.html`                                        | Draws every variant of every screen and reports a control, a title or a line of text that leaves its screen or is cut.                                                             |

The server is `serve.mjs`: a hundred lines over Node's `http`, no dependency. Any static server pointed at this folder does the same.

## What is here

```
brief.md             who the design is for, what it must never look like, the three directions, licences, the owner's choice
data/
  outing.json        the reference Outing of scenario SC-1: every name, time and distance on the screens
  story.json         the passages shown while "a Story plays", quoted and cited
  map.json           the geometry of the map (generated)
assets/fonts/        the font files, each family with its licence
directions/
  shared/            the page around the mockups, device outlines, icons, the map, the loading of data
  guidebook/         direction 1
  timetable/         direction 2
  playbill/          direction 3
  index.html, one.html, <direction>.html and their scripts
tools/build-map.mjs  builds data/map.json from OpenStreetMap data
tools/add-ubreve.py  adds the letters ŭ and Ŭ to Sofia Sans, which lacks them (run once; needs fontTools)
serve.mjs            the static server behind `pnpm design`
```

A direction is two files: a module that returns the markup of each screen for a system, a theme and a language, and a style sheet scoped to `.d-<name>`. The text of a screen exists once per language in that module; the numbers come from `data/`. Nothing is built or bundled.

## Rules of the folder

- **A mockup shows real content.** Names, times and distances come from `data/outing.json`. Story text is a cited passage of an open source or is marked as sample text; no history is written for a mockup.
- **A city is data.** The city appears in `data/`, never in a script or a style sheet.
- **Everything shipped has a licence that allows it**, recorded in [the brief](brief.md#8-licences). A font is added as files under `assets/fonts/<family>/` with its licence text beside them, a `@font-face` rule in `directions/shared/fonts.css`, and a line in that table.
- **A map treatment uses only what a MapLibre style can express** ([ADR-0008](../docs/adr/0008-maps-openstreetmap-pmtiles-and-maplibre.md)): fills, fill patterns, lines with widths, casings and dashes, symbols, text along a line.
- **Pictographic characters are not icons.** Icons are drawn, in `directions/shared/frames.js`.

## Which checks of the repository apply

| Check                                                  | Applies to this folder                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint:format` (Prettier)                          | Yes: every Markdown, HTML, CSS, JavaScript and JSON file. `data/map.json` is generated and is left out in `.prettierignore`. |
| `pnpm lint:eslint`                                     | Yes: the scripts, with browser globals for `directions/` (`eslint.config.mjs`).                                              |
| `pnpm lint:plan`                                       | Yes, indirectly: the status of each design package in the work plan.                                                         |
| `pnpm lint:types`, `pnpm lint:boundaries`, `pnpm test` | No: there is no TypeScript and no test here. The scripts carry JSDoc types for the editor.                                   |
| The pre-commit and commit-message hooks                | Yes. The commit scope is `design`.                                                                                           |

Before a change to a direction is pushed, open `/directions/check.html`: it has to report nothing.

Two checks are made by eye, because no tool makes them yet: every screen at the width of a phone and of a desktop, and every text-on-background pair at WCAG 2.2 level AA. The sheet of each direction computes the contrast of its pairs from its own style sheet and writes "passes" or "FAILS" beside each. A script that fails the build on a failing pair comes with the design system (`D-02`).

## Rebuilding the map

`data/map.json` is cut from the city data of the spike in [`spikes/minsk-city-data`](../spikes/minsk-city-data/README.md), whose downloads are not committed. With that spike run once (`npm install && npm run fetch && npm run all` in its folder):

```sh
node design/tools/build-map.mjs --spike spikes/minsk-city-data
```

It reads the Outing from `data/outing.json`, cuts the map around it, finds the walked line on the spike's pedestrian graph and prints the legs beside the measured ones.
