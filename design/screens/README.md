# The screens

Every screen of the mockups, assembled from the components of the [design system](../system/README.md). The phone's screens of the solo Outing are work package `D-03` of the [work plan](../../docs/WORK-PLAN.md#d-03--screens-of-the-solo-outing-on-ios-and-android).

- [Open it](#open-it)
- [What is here](#what-is-here)
- [How a screen is made](#how-a-screen-is-made)
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

## Adding a screen

1. Write the function in the file of its part of the product; take words from `words.js` and data from `design/data/`.
2. Add it to `registry.js`: its id, title, group, the requirement IDs it shows, a note on how the specification was read and what is a sample, its systems, and its states. For each of the five states — usual, loading, empty, no network, error — that it cannot be in, say why under `absent`.
3. If a scenario runs through it, add the step.
4. Open `/screens/check.html#<id>`.

## What is checked

`/screens/check.html` draws every screen of the registry in each of its states, for each system, in the three themes and both languages, and reports:

- a control smaller than its platform's target (44 pt on iOS, 48 dp on Android), or without a name for a screen reader;
- a control cut by the pane that holds it, or covered by another pane;
- a pane, a heading or a control that leaves its screen;
- a line of text that is cut or clipped; a prominent action whose words take two lines.

What stands in a part that scrolls may lie below its edge: it is reached by scrolling. What is behind a pane that waits for an answer is covered on purpose. At the close of `D-03` it reported 1 008 drawings of 35 screens and 7 128 controls measured, with nothing to look at; the system's own check reported 1 184 drawings of 45 components.

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

## The owner's acceptance

**`D-03` — accepted on 25 November 2026.** The owner accepted the screens of the solo Outing on iOS and Android as they were shown, without asking for another round.

The readings of the specification listed above were shown to the owner together with the screens; the owner accepted the screens without changing any of them. What was left to `D-05` stays there: the click-through walks, the review against the brief, the independent review, and the check on real phones.
