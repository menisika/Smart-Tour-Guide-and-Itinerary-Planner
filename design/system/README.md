# The design system

One system of tokens and components from which every screen of Promenade is made: the same idea on each platform, and native to each. It is work package `D-02` of the [work plan](../../docs/WORK-PLAN.md#d-02--design-system) and starts from the direction the owner chose in `D-01`, "Timetable with a guide" ([the brief](../brief.md#6-the-directions)).

- [Open it](#open-it)
- [What is here](#what-is-here)
- [How it is made](#how-it-is-made)
- [Changing it](#changing-it)
- [What is checked, and by what](#what-is-checked-and-by-what)
- [The questions of the brief, as the system answers them](#the-questions-of-the-brief-as-the-system-answers-them)
- [What later packages should know](#what-later-packages-should-know)
- [Not done here, on purpose](#not-done-here-on-purpose)
- [The owner's acceptance](#the-owners-acceptance)

## Open it

```sh
pnpm design
```

| Page                                                                                            | What it is                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <http://localhost:4310/system/>                                                                 | The system: every token and every component, in light, dark and bright sunlight, in Russian and English, at three text sizes, for iOS and Android side by side; the map, the icons, the mark, the motion studies, the accessibility rules. |
| `/system/check.html`                                                                            | Draws every component in every system, theme, language and text size and measures it: target sizes, names for screen readers, cut and clipped text, what leaves its screen, reach of a thumb. It has to report nothing.                    |
| `/system/motion/arrival.html`, `/system/motion/story.html`, `/system/motion/recalculation.html` | The three motion studies, each alone: it can be replayed, slowed to a quarter, played with its sound, and shown with "reduce motion".                                                                                                      |
| `/directions/`                                                                                  | The two reference screens of `D-01`, now assembled from the components of this system.                                                                                                                                                     |

The live map on the system's page is drawn by MapLibre GL JS, which needs WebGL 2: a current Chrome, Safari or Firefox. Everything else works in any browser of the last two years.

## What is here

```
tokens.json          the one source: colour in three themes, type, space, radii, sizes, the console's measures, elevation, motion, sound, the map's measures
tokens.css           generated: the tokens as CSS custom properties
map/style.*.json     generated: the MapLibre style of the map, one per theme
mark/                generated: the sign, the application's icon, the wordmark — and outline.json, the letters of the name as outlines
icons.js             the product's own icons, with the name of each in both languages
strings.js           every word the components say, in Russian and English
parts/               the components: functions that return markup — map, route, story, controls, sheets, lists, states, platform, layout, web, console, party
css/                 their style sheets, one per kind, written from the tokens alone
system.css           all of the above as one style sheet: what a page of screens links
specimens.js         every component as a specimen: a piece of a screen with real content; the one list behind the page and the check
index.html, .js      the system's page; page.css and stage.css are the page's own
words.js             where iOS and Android differ and why; the accessibility rules with what checks each
check.html, .js      the check of every component, drawn
motion/              the three studies and what they share
live-map.js          the generated map style, running in MapLibre on a real tile archive
colour.js, motion.js, mark.js   arithmetic and drawing shared by the pages and by the tools
```

Beside it, in `design/tools/`: `build-system.mjs` writes everything generated, `check-system.mjs` is `pnpm lint:design`, `outline-wordmark.py` draws the letters of the wordmark from the typeface once.

## How it is made

**Tokens first.** [`tokens.json`](tokens.json) is the only place a colour, a size, a duration or a curve is written. The style sheet, the map styles and the files of the mark are generated from it; the page reads it; the components use nothing else. `F-12` turns this file into the source the three clients import.

**Two materials, by rule.** Liquid Glass is the layer of controls and navigation over the content; text that is read sits on a solid page. A pane of glass becomes solid — the same shape, an opaque surface — in four cases: on Android (Material 3 surfaces, by the owner's decision), in the sun theme, in the saver mode, and with "reduce transparency". All of it is in [`css/materials.css`](css/materials.css).

**A component is a function and a style sheet.** A part returns markup for a system, a theme and a language; its style sheet is written from the tokens. A screen arranges parts and draws nothing of its own: [`directions/timetable/timetable.js`](../directions/timetable/timetable.js) is the two screens of `D-01` made that way, and the screens of `D-03` are made the same way.

**A specimen is real.** Names, times and distances come from `design/data/`. Where a state is not in the reference Outing — a Route that is tight, an Outing that runs late — the specimen says in its note that the number is a sample of a state. The Route recalculated is not a sample: the way round the skipped Place was found on the pedestrian graph by `design/tools/build-map.mjs`.

## Changing it

- **A token:** edit `tokens.json`, run `pnpm design:build`, then `pnpm lint:design`. A colour that takes a pair under its contrast fails there, with the pair named. Never edit a generated file: `pnpm lint` fails when one is stale.
- **A component:** change its part and its style sheet, look at its specimen on the page, then open `/system/check.html`.
- **A new component:** a function in `parts/`, its rules in `css/`, a specimen in `specimens.js` — which puts it on the page and under the check at once. A control that is only an icon takes its name from `strings.js`.
- **An icon:** add it to `icons.js` with its name in both languages in `ICON_NAMES`; `pnpm lint:design` fails on an icon without one.
- **The wordmark:** `~/.venvs/claude/bin/python design/tools/outline-wordmark.py` (it needs fontTools and brotli), then `pnpm design:build`.

## What is checked, and by what

| What                                                                                              | By what                                              | When                                     |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| Every pair of a text or a graphic and its ground, in three themes, against WCAG 2.2 level AA      | `pnpm lint:design` (`design/tools/check-system.mjs`) | `pnpm lint`, the pre-push hook, CI       |
| The same pairs against 7 : 1 for text in the sun theme                                            | the same                                             | the same                                 |
| Declared sizes of everything touched against 44 pt on iOS and 48 dp on Android; the smallest text | the same                                             | the same                                 |
| The same colours in every theme, each with a stated role; every icon named in both languages      | the same                                             | the same                                 |
| The map styles are valid MapLibre styles and have the same layers in the three themes             | the same, with `@maplibre/maplibre-gl-style-spec`    | the same                                 |
| Generated files are current                                                                       | the same                                             | the same                                 |
| Every control as drawn: at least its platform's target, and named                                 | `/system/check.html`                                 | before a change to a component is pushed |
| Nothing cut, clipped or outside its screen at 100 %, 130 % and 200 % of the text size             | `/system/check.html`                                 | the same                                 |
| On whole screens, what is used on the move lies in the lower 42 %                                 | `/system/check.html`                                 | the same                                 |
| The two reference screens: nothing cut, nothing outside its screen, in 24 drawings                | `/directions/check.html`                             | the same                                 |
| The map style on real tiles                                                                       | the live map on the system's page                    | by eye                                   |
| How anything looks; a state told by more than colour                                              | the system's page                                    | by eye                                   |

At the close of this package the check page reported 848 drawings of 30 components and 2 456 controls measured, with nothing to look at, and `pnpm lint:design` reported 132 measured pairs passing.

The two drawn checks are pages and not commands because they need a browser to lay the controls out, and the repository has no browser among its tools. `F-12` builds the components in code and runs an automated accessibility check on them (ADR-0007, point 6); this page is what that check is set beside.

## The questions of the brief, as the system answers them

[Section 9 of the brief](../brief.md#9-what-the-mockups-ask-the-owner) left four things to this package. Each answer is a proposal: the owner's "no" changes the system.

**Does the guide's page open to full height by itself when a Story begins?** No. The page rises to half height by itself on arrival, and opens in full only by the person: the grabber, the key "Text" in the player, a tap on the text. At half height the map, the position and the strip stay in sight, which is what `OUT-2` asks for and what a person on the move needs. Opened in full, the Story is set a size larger, the photograph grows, and time, progress and the next Place stay on the board and in the folded player. Both are drawn as "The page of the guide" on the system's page.

**Bright sunlight.** A third theme, `sun`: every pane solid with a definite edge, text held to 7 : 1, heavier icons, a wider and darker line, streets with an edge. It is a switch in the menu of the Outing. Whether it should also come on by itself is left open on purpose: it depends on what each phone reports about the light around it, which has not been tried, and how the theme reads in real sun is the owner's to judge outdoors in `D-05`.

**The battery and the tilted map.** The fallback is drawn: the saver mode shows the map flat with the direction of travel up, nothing standing, no blur behind any pane and nothing in motion (`OUT-17`). The measurement itself needs a mid-range Android phone and is not made here.

**A Place without a photograph** is shown by its own plan: its walls as the map has them, with the sign of its kind — at the head of the guide's page and, as a tile, wherever a thumbnail would be. It is real, it says plainly that there is no photograph, and nothing is drawn to stand in for one.

Question 8 of the brief — whether the plainer Android is acceptable — stays the owner's. What Android has here beyond solid surfaces is the shape scale of Material 3 Expressive, its own switch, segments, field, dialog and navigation bar, and the same map, type and motion.

## What later packages should know

- **MapLibre Native has no `sky`** (the style specification marks it as unsupported on Android and iOS). The haze at the horizon of the tilted map is therefore an overlay the application draws, not a part of the style.
- **The published tiles carry no Belarusian name.** The archive of the Protomaps build of 22 November 2026 has `name`, `name:ru`, `name:en` and some thirty other languages, and no `name:be`. The style names things by the person's language and falls back to `name`, as ADR-0008 decides; a map in Belarusian would need tiles built with that field.
- **Names on the map are in Noto Sans**, the face whose glyph ranges exist as files (ADR-0008). Setting them in Onest needs glyph ranges built from Onest. The numbers of the stops are drawn by the style in the same face; as native markers they can be in Unbounded. Both are choices for the map component (`S1-OUT`).
- **The style ships with two building layers.** `buildings` is on for the plan; the application shows `buildings-standing` and hides `buildings` with the walking camera, and shows neither extruded in the saver mode. A theme changes paint only: the three styles have the same layers.
- **The map component rewrites three things in a style:** where the tiles are, where the glyphs are, and the language of the names (`metadata` says which layers). `live-map.js` does exactly that and is the shortest example of it.
- **MapLibre GL JS 6 needs WebGL 2** and is loaded as ES modules; the PMTiles archive has to be served with byte ranges, which `design/serve.mjs` now does.
- **The type scale is smaller than the one `D-01` drew with.** Sixteen sizes of the sans became eight; the two reference screens were redrawn on the scale and their check is still clean.
- **`font` as a shorthand resets numeral settings.** Roles of the type scale are applied with the shorthand, so tabular numerals are said to every element (`css/core.css`). In React Native this is `fontVariant: ['tabular-nums']` on the text styles.
- **Sounds are two descriptions, not files.** `tokens.json` gives each as tones with a soft attack; the studies play them through the browser. The application may synthesise them the same way or render them once to audio.

## Not done here, on purpose

- No check on a real phone and no independent visual review: both are `D-05`.
- No screens beyond the two of `D-01`: the solo Outing is `D-03`, the web and the console `D-04`, the Party and the Catalog `D-09`. Each adds to the system the components its screens need, with a specimen: the [screens](../screens/README.md) say which.
- No component in the code of the applications: that is `F-12`.
- No measurement of the battery, and no trial of the sun theme outdoors.
- The destinations of the bar at the bottom are placeholders; which there are is settled with the screens.

## The owner's acceptance

**Accepted on 25 November 2026.** The owner accepted the system as it was shown, without asking for another round; `D-02` is closed. The screens of `D-03`, `D-04` and `D-09` are made from it.

The four answers given above to the questions of the brief were shown to the owner as proposals together with the system; the owner accepted the system without changing any of them. Two things in them stay open by their own wording and are not settled by this acceptance: whether the sun theme comes on by itself, and what the tilted map costs the battery. Both need a phone, and belong to `D-05`.
