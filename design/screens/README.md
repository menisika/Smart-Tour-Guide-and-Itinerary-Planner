# The screens

Every screen of the mockups, assembled from the components of the [design system](../system/README.md). The phone's screens of the solo Outing are work package `D-03` of the [work plan](../../docs/WORK-PLAN.md#d-03--screens-of-the-solo-outing-on-ios-and-android); the public web and the internal console are `D-04`.

- [Open it](#open-it)
- [What is here](#what-is-here)
- [How a screen is made](#how-a-screen-is-made)
- [The public web](#the-public-web)
- [The console](#the-console)
- [Adding a screen](#adding-a-screen)
- [What is checked](#what-is-checked)
- [What is real and what is a sample](#what-is-real-and-what-is-a-sample)
- [How the specification was read](#how-the-specification-was-read)
- [The owner's acceptance](#the-owners-acceptance)

## Open it

```sh
pnpm design
```

| Page                                                                             | What it is                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <http://localhost:4310/screens/>                                                 | The index. First the scenarios of the specification, each as a walk from its first screen to its last; then every screen in each of its states, with the requirements it shows. Switches for the phone, the theme and the language.            |
| `/screens/one.html#walk=SC-1&step=1`                                             | A step of a scenario alone, at its real size, with “back” and “next”. On a phone the outline of the device is dropped and the screen fills the width (`pnpm design --lan`).                                                                    |
| `/screens/one.html#screen=route&state=usual&os=ios&theme=dark&lang=en`           | One screen in one state.                                                                                                                                                                                                                       |
| `/screens/sheet.html#screens=route,edit&os=ios,android&theme=light,dark&lang=ru` | A sheet of drawings side by side with nothing around them: for looking at many at once, and for comparing one screen across systems, themes and languages. `screens` takes ids of screens or of packages (`D-03`); `state` narrows the states. |
| `/screens/check.html`                                                            | Draws every screen in every state, system, theme and language and measures it. It has to report nothing. `check.html#D-03` or `check.html#route,edit` checks a part.                                                                           |

## What is here

```
registry.js      every screen once: its title, the requirements it shows, its systems, its states and why a state is absent; and the scenarios as walks
render.js        draws a screen of the registry in the outline of its device; loads the data
words.js         the words of the phone's screens, once per language
phone/
  kit.js         what the phone's screens share
  before.js      first launch and the Profile, the request, the Routes offered, the Route, editing, the Route Pack, the check before the start
  outing.js      a Story, the way between two Places, Quiet Mode, sources and Corrections, the lock screen, questions and changes on the way, the end, the journal
  after.js       Routes and Outings kept, the account, Corrections, notifications, the Profile and settings
web/
  pages.js       the public web at two widths: the Route Page, the Invitation, the request, editing, a Story by hand, signing in, deleting the account; what a messenger shows of a link
  words.js       the words the web adds
console/         the internal console: its screens, its words, and the two scenarios it carries
index.html, .js  the index
one.html, .js    one screen alone
sheet.html, .js  many drawings side by side
check.html, .js  the check of every screen, drawn
page.css         the pages' own style; nothing in it is a part of a screen
```

## How a screen is made

A screen is a function that takes a system, a theme, a language, the data and a state, and returns markup made by the parts of the design system (`system/parts/`). It draws nothing of its own: where a screen needed a component the system lacked, the component was added to the system with its rules and a specimen, so that it stands on the system's page and under its check. How the parts stand on a screen — where a sheet begins, what floats above the bar — is in `system/css/screens.css`, written from the tokens.

Two kinds of screen share everything else. **The map under a sheet**: the map fills the screen, the timetable speaks on glass over it — the request, the Routes offered, the Route, the Outing. **A page**: solid, because it is read, under a bar; where it helps, it opens with a photograph of a Place, credited where it stands. On Android every pane is a solid Material surface, by the owner's decision.

The bar of destinations has three: **Plan** (the Route request), **Routes** (saved Routes and past Outings) and **Profile** (the account, the Profile, settings).

## The public web

The public web is the web target of the application ([ADR-0007](../../docs/adr/0007-web-from-the-expo-codebase-and-a-separate-console.md)): the same components, without what a browser cannot do. Every page is drawn at two widths. **At a desk** (1280 × 800) the map fills the window, a bar holds the name of the product, the two languages and the way into the application, and what the timetable says stands in a panel of glass at the side, with its actions at its foot. **In a phone's browser** (390 × 780) the panel is a sheet under the map. What interrupts a page and waits — signing in, deleting the account — is a solid card in the middle of the window, and a sheet from the bottom edge on a phone.

A browser cannot start a Story by itself and cannot work without a network (specification §6). The pages say so in words, once, and have no "no network" state: the browser says that itself.

**What a messenger shows of a link** is drawn in a conversation that is plainly not ours: the frame belongs to the messenger. Ours are the picture — composed at half of 1200 × 630: the line of the Route on the map, the name of the product, the length of the walk in the timetable's numerals —, a title, one line and the address. A Route Page and an Invitation have different previews, because they are different links (§4.9, rules).

Two walks run through these pages and are not scenarios of the specification: `WEB-1`, a Route opened from a messenger, and `WEB-2`, an Invitation answered in a minute — the first steps of SC-2.

## The console

The internal console is its own application, desktop first ([ADR-0007](../../docs/adr/0007-web-from-the-expo-codebase-and-a-separate-console.md), point 4), drawn at 1440 × 900. It is one family with the product and is never mistaken for it: the same colours, faces, radii and icons — Unbounded for numbers, Onest for words, the serif only for what the guide says: the text of a fact, of a Story, a source — and its own density. It has no glass at all, a permanent navigation at the side, tables, an editor and a map where the work is about a place. Its measures are tokens of their own (`tokens.json` → `console`): a control is 32 px, a row of a table 40 px, and the least thing that can be clicked is the 24 px of WCAG 2.2, criterion 2.5.8 — a pointer at a desk, not a finger.

Its components are in `system/parts/console.js` and `system/css/console.css` (classes `cs-…`), with thirteen specimens on the system's page, drawn once at the width of a desk. Its words are in `console/words.js`, in both languages.

| Screen                  | What it is for                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `console-queue`         | The verification queue of Dossiers, ordered by expected popularity, sensitivity and open Corrections (`CUR-1`)        |
| `console-dossier`       | The Dossier editor: facts with their sources, themes and sensitivity; the preview of Stories; mark verified (`CUR-2`) |
| `console-pronunciation` | The pronunciation editor with playback (`CUR-3`)                                                                      |
| `console-place`         | The Place editor with its map: boundary, Entrances, Access Rules, trigger radius; merge, hide (`CUR-5`)               |
| `console-changes`       | The queue of Proposed Changes with their evidence, and the history of a Place with undo (`CUR-12`)                    |
| `console-corrections`   | The Corrections inbox: the statement, its source, the claim (`CUR-7`)                                                 |
| `console-preparation`   | Starting Preparation and watching its progress, failures and cost (`CUR-4`)                                           |
| `console-sources`       | The Sources with doubtful matches, and the table of Freshness Checks (`CUR-12`)                                       |
| `console-venues`        | Venue selection (`CUR-6`)                                                                                             |
| `console-dashboards`    | Coverage, cost per Place, ratings, trigger reliability, failures (`CUR-8`)                                            |
| `console-admin`         | Roles, Plans and what they grant, limits and budgets of Preparation, the audit log (`CUR-9`)                          |

Scenario SC-5 runs through them from starting Preparation to a verified Dossier, and the console half of SC-6 (`SC-6-console`) from the Corrections inbox to the fact fixed and the author told.

**What is real in the console.** The queue (Places, monthly page views, the languages of their articles, the heritage mark), the phrases and stresses of the pronunciation editor, a real Territory with its boundary, Entrances and nested Places, a real pair of duplicates, the Proposed Changes with their old and new values, the doubtful matches, the counts and dates of the Sources, the schedule of Freshness Checks, the Venues with their hours: all copied from the city-data research (`docs/research/06-minsk-city-data.md`) into `data/console.json`, each block with its file and licence. The facts of the Dossier are the sentences of the cited passage. **What is a sample**, and marked so in the data and in each screen's note: people, which Dossier is a draft, the run of Preparation and every sum of money, the dashboards' cost, ratings and trigger reliability, everything in Administration, the Corrections. The claim of a Correction is shown as its kind and a dash: no claim about history is written for a mockup.

## Adding a screen

1. Write the function in the file of its part of the product; take words from `words.js` and data from `design/data/`.
2. Add it to `registry.js`: its id, title, group, the requirement IDs it shows, a note on how the specification was read and what is a sample, its systems, and its states. For each of the five states — usual, loading, empty, no network, error — that it cannot be in, say why under `absent`.
3. If a scenario runs through it, add the step.
4. Open `/screens/check.html#<id>`.

## What is checked

`/screens/check.html` draws every screen of the registry in each of its states, for each system, in the three themes and both languages, and reports:

- a control smaller than its platform's target (44 pt on iOS, 48 dp on Android, 44 px on the web, 24 px in the console), or without a name for a screen reader;
- a control cut by the pane that holds it, or covered by another pane;
- a pane, a heading or a control that leaves its screen;
- a line of text that is cut or clipped; a prominent action whose words take two lines.

What stands in a part that scrolls may lie below its edge: it is reached by scrolling. What is behind a pane that waits for an answer is covered on purpose. At the close of `D-03` it reported 1 008 drawings of 35 screens and 7 128 controls measured, with nothing to look at; the system's own check reported 1 184 drawings of 45 components. At the close of `D-04`: 1 398 drawings of 55 screens and 15 840 controls; the system's check, 1 294 drawings of 61 components.

It does not judge how a screen looks. That is done by eye, here and in `D-05`.

## What is real and what is a sample

| On the screens                                                                                                                                                                                  | Where it comes from                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names of Places, times, distances, the map, the walked line, photographs                                                                                                                        | The reference Outing of SC-1 (`data/outing.json`, `map.json`, `photos.json`), as in the [brief](../brief.md#7-what-the-mockups-show-and-where-every-piece-comes-from). |
| The Route without one Place: in the options, while editing, in the versions, after a skip                                                                                                       | Measured: the way round the Place was found on the pedestrian graph (`map.json` → `detour`).                                                                           |
| The street the person stands on when off the Route                                                                                                                                              | The same real way round; “120 m” is a sample of the state.                                                                                                             |
| The Venues of a Break                                                                                                                                                                           | OpenStreetMap: names and opening hours as they are, the distance as a straight line (`data/venues.json`). Which Venues are offered is a Curator's selection.           |
| The text of a Story and its source                                                                                                                                                              | A passage quoted from Wikipedia and cited (`data/story.json`); it stands in for a Story.                                                                               |
| The third Route offered; “nothing fits”; a Custom Place that breaks the budget; six minutes behind; 18 % of battery; 7 of 18 MB; the account; the outcomes of Corrections; the digits of a code | `data/samples.json`: marked samples of states, never shown as measured. Each screen that uses one says so in its note.                                                 |
| How the Wish was understood                                                                                                                                                                     | A sample of an interpretation of the Wish of SC-1: the planner that reads a Wish does not exist yet.                                                                   |
| The lists of themes and of Dealbreakers                                                                                                                                                         | The drafts of the specification (§4.2), which stage S1 fixes.                                                                                                          |

No claim about history is written for a mockup: the field of a Correction is shown empty.

## How the specification was read

A mockup is a claim about what the specification means. These are the places where a drawing had to decide; a “no” to any of them changes the screens.

1. **Not every screen can be in all five states.** `D-03` asks for each screen in its states: usual, loading, empty, no network, error. A screen that is drawn from what is on the device has nothing to load; the Outing runs from a Route Pack that is complete and checked. The registry names, for every screen, the states it is drawn in and the reason for each one it cannot be in, and the index shows both.
2. **Without a network, a solo Outing of stage S1 has little that is unavailable.** SC-4 names the Chat, live positions and “ask the guide”; a Party of one has no Chat and no shared positions (`PTY-1`), and “ask the guide” is of stage S3. What stage S1 shows as unavailable is what it has: a new Route, sharing, opening a source, signing in, deleting the account. The rows of the Party are drawn with the Party in `D-09`.
3. **Travel Mode is not shown in the request** while only “on foot” exists (`RTE-1`, S4).
4. **“Nothing fits” is the empty state of the Routes offered**, with one-tap relaxations (`RTE-10`). Its numbers follow from the measured leg to the nearest Place, a Route of a single Place (`RTE-11`).
5. **A Dealbreaker is a switch and a dislike is a chip**, on two screens, so that hard and soft are never confused (§4.2, rules).
6. **Unknown opening hours (`RTE-13`) are shown on a sample.** Every Place of the reference Outing is seen from outside and has no hours to miss.
7. **“Will I reach the next Place before it closes” (`OUT-2`) reads “outside it is always open”** for the same reason.
8. **Shorten and extend show the request, not the answer.** What the planner would keep is not computed for the mockup; the answer has the shape of the recalculated Route after a skip.
9. **The end of an Outing is a rating, not the Recap.** The Recap that can be saved or posted is of stage S3 (`OUT-21`) and is drawn in `D-09`.
10. **“Update required” has no requirement in the specification.** It follows from the versioning of the API (ADR-0025).
11. **Sign-in with Apple and with Google is drawn without their marks**: in the application those are the systems' own buttons.
12. **A Story that has ended asks “did you like it?” without waiting** (`FBK-2`): the question stands above the player and blocks nothing.

13. **The public web has no "no network" state.** A browser does not work without a network (§6); the pages say in words what only the application does.
14. **The Invitation asks what one likes as chips that are on or off**, not as three states: `PTY-4` asks a Participant for "liked themes", and a minute is short. Dealbreakers are switches there too.
15. **The Meeting Point of the sample Party is the start of the reference Outing**; the Party is that of SC-2, with the first names of the specification's scenarios.
16. **The least target in the console is 24 px**, the minimum of WCAG 2.2 for a pointer, not the 44 pt of a finger. `NFR-27` asks level AA of the web; the console is used at a desk.
17. **A fact of a Dossier is shown in the language of its passage**: the Russian passage in Russian, the English one in English. In the product a fact is language-neutral and Stories are generated per language (`KNW-20`).
18. **The author of a Correction is "a User" or "a Guest" in the console**, never a name ([ADR-0031](../../docs/adr/0031-keeping-the-base-of-places-current.md), point 3).
19. **A change of opening hours from the map waits for a Curator only where a Curator had set the hours**; filling an empty value is applied without a person and marked "not reviewed" (`PLC-13`).
20. **The Sources with doubtful matches and the Freshness Checks are two tabs of one screen.**
21. **A Venue's "why here" is left empty** (`KNW-18`): nothing is written about a real Venue for a mockup.
22. **Budgets of Preparation are monthly and per provider; a step beyond one is not started** ([ADR-0012](../../docs/adr/0012-preparation-pipeline-durable-workflows-on-postgres.md), point 6).
23. **Opening hours are shown as the map has them**, with "known" or "unknown" beside them, not as a week's grid.

## The owner's acceptance

**`D-03` — accepted on 25 November 2026.** The owner accepted the screens of the solo Outing on iOS and Android as they were shown, without asking for another round.

The readings of the specification listed above were shown to the owner together with the screens; the owner accepted the screens without changing any of them. What was left to `D-05` stays there: the click-through walks, the review against the brief, the independent review, and the check on real phones.
