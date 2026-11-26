# The walk-through

The last step of the design before anything is built: the six scenarios as walks one can click through, the review of every screen, and the check that every package of stage S1 has its screen. It is work package `D-05` of the [work plan](../../docs/WORK-PLAN.md#d-05--walk-through-and-the-owners-approval).

- [Open it](#open-it)
- [The walks](#the-walks)
- [A first-time walk](#a-first-time-walk)
- [The review against the brief](#the-review-against-the-brief)
- [The independent review](#the-independent-review)
- [Stage S1, package by package](#stage-s1-package-by-package)
- [The export of approved screens](#the-export-of-approved-screens)
- [The owner's approval](#the-owners-approval)

## Open it

```sh
pnpm design          # then http://localhost:4310/walkthrough/
pnpm design --lan    # the same on the local network: open the address it prints on a phone
```

| Page                      | What it is                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/walkthrough/`           | The six walks, with the choice of phone, theme, language and hints. On a phone it starts as that phone.               |
| `/walkthrough/walk.html`  | One step at its real size; the screen itself leads on. On a phone the screen fills the width.                         |
| `/walkthrough/check.html` | Draws every step of every walk for both phones and both languages and looks for a dead end. It has to report nothing. |

## The walks

| Walk | Scenario                               | Where                           |
| ---- | -------------------------------------- | ------------------------------- |
| SC-1 | Three hours before the train           | the phone                       |
| SC-2 | Saturday with friends — its main steps | the phone and a phone's browser |
| SC-4 | No network                             | the phone                       |
| SC-5 | The Curator prepares the city          | the console, at a desk          |
| SC-6 | A Correction                           | the phone, then the console     |
| SC-7 | Publishing a Route — its main steps    | the phone                       |

A walk is the scenario of the registry of the screens (`design/screens/registry.js`), step by step. Each step has a **way on**: the control of the screen that leads to the next step. Where a step names none, it is the prominent action of the screen as it stands — in a question, in a sheet that waits, at the foot of a page. Where the next step comes by itself — a Story that starts on arrival, a download that ends, the network going — the step is marked `auto` and a tap anywhere goes on; the bar says so. `walks.js` holds the rule; a step with no way on is a dead end and the check reports it.

The mock screens are drawings: only the way on is live. A tap on anything else does nothing, and is counted.

## A first-time walk

For someone who has never seen the product: choose **Hints: off** on the page of the walks and hand over the phone. No control is marked. Every tap that leads nowhere is kept on that device with the name of what was tapped and the step it happened on; after two of them on one step the way on shows itself, so nobody is stuck. Back on the page of the walks, "Stumbles" lists them and copies them. They are kept in the browser of that device only and are sent nowhere.

Each stumble is then either designed out, or recorded here with the reason it stays.

## The review against the brief

Every screen was looked at against the list of [section 3 of the brief](../brief.md#3-what-it-must-never-look-like) and against the usual marks of generated design. What was found and corrected:

| Found                                                                                                                               | Rule of the brief                                        | What was done                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A sheet that waits — the Route Pack, the versions, the check before the start, a Break, a Complaint — was glass and held paragraphs | Glass under text that is read                            | Every sheet that waits is solid (`over` in `system/parts/layout.js`): it dims what is behind it, so there is nothing to see through |
| Reviews and the Chat stood on a glass sheet over the map                                                                            | Glass under text that is read                            | A sheet that holds what people wrote is solid (`.tt-sheet.is-solid`)                                                                |
| The lines of the chart showed between the two actions at the foot of the Route                                                      | —                                                        | Under the two actions the chart dissolves into the sheet                                                                            |
| The author of a photograph stood right under the words set on it                                                                    | Tiny text; a credit is shown where a photograph is large | Under words the credit moves to the top of the photograph                                                                           |
| The rating of an Outing was shown already given                                                                                     | —                                                        | It is shown not given                                                                                                               |
| List pages — sign-in, "you are a guest", "update required" — were words on white                                                    | The owner's taste: no purely typographic page            | They open with a photograph of a Place (done in `D-03`)                                                                             |

What was looked for and not found: a pictographic character used as an icon (the icons are the product's own, drawn, each with a name); an interchangeable grid of cards (a Route is always a sequence or its own line on the map); filler copy (every name, time and distance is of the reference Outing; samples are marked in the data and in each screen's note); a chat with an assistant; a mascot, an award, a streak; a map dressed as another company's; a state told by colour alone.

## The independent review

A reviewer who was told nothing of the reasoning behind the direction, and was kept from the brief and the READMEs, looked at every screen in iOS, light, Russian, with samples of Android, dark, the sun theme, English, the web and the console. Its verdict: "one designed product with a point of view, not a template", weakest in glow and glass under text, small secondary text, and pages left mostly empty. Each of its twenty-two findings is settled:

| №   | Finding                                                                                     | Settled                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On the Route, the list shows between "Pack" and "Start the outing"                          | **Corrected.** The chart dissolves under the two actions                                                                                                                                                                                                                         |
| 2   | Every prominent action has a mint glow under it                                             | **Corrected in part.** The coloured shadow of tinted glass is halved in size and in strength (`materials.css`). It is kept as a shadow: depth is the owner's wish, and on Android the action has the plain shadow of Material                                                    |
| 3   | A pale green blur in sheets and panels                                                      | **Corrected** for sheets that wait: they are solid. **Kept** for the sheet of the Route and the panels of the web: there the blur is the map seen through glass, which is the accepted direction, and they hold controls                                                         |
| 4   | Glass under headings and paragraphs: versions, the Route Pack, editing, the Route as a list | **Corrected** for versions, the Route Pack and every sheet that waits. **Kept** for the Route and its editing: the sheet of the Route is the timetable speaking, on regular glass, as the owner accepted in `D-01` and `D-02`                                                    |
| 5   | Small grey secondary text                                                                   | **Kept, measured.** The reviewer saw the screens at three quarters of their size. The smallest text is 11 pt (10 pt for a number in a disc), every pair of text and ground holds level AA (`pnpm lint:design`), and the sun theme holds 7 : 1. To be tried outdoors by the owner |
| 6   | The credit of a photograph collides with the words on it                                    | **Corrected.** Under words the credit moves to the top of the photograph                                                                                                                                                                                                         |
| 7   | Sign-in, the journal, Corrections, deleting the account are mostly blank                    | **Corrected in part.** Sign-in and "you are a guest" open with a photograph. A list is as long as its data: the journal has three lines because three things were done. Nothing is added to fill a page                                                                          |
| 8   | On the web, "Sign in" stands in the bar while an account is being deleted                   | **Corrected.** The bar shows the account                                                                                                                                                                                                                                         |
| 9   | On the web a Story is cut mid-sentence; a panel on a huge map                               | **Kept.** The text moves by whole lines with the voice (the motion study of `D-02`); the map filling the window is the direction                                                                                                                                                 |
| 10  | "Open in the app" and "Get the app" for the same intent                                     | **Corrected.** One label at both widths                                                                                                                                                                                                                                          |
| 11  | The Cyrillic "№" in English lines                                                           | **Corrected**, in the source of a sentence and in the console                                                                                                                                                                                                                    |
| 12  | "Why it is here" reads as a repeated template                                               | **Kept, and said.** The lines are a stand-in for `RTE-9` that restates the data ([brief, section 7](../brief.md#7-what-the-mockups-show-and-where-every-piece-comes-from)); the planner writes the real ones                                                                     |
| 13  | Four stars already given; stars lean towards a game                                         | **Corrected:** none is given. A rating of one to five is `FBK-1`; it is not an award                                                                                                                                                                                             |
| 14  | The words of the first screen are generic                                                   | **Kept.** They say what the product does in two sentences, and the screen was accepted. A question for the owner on the walk                                                                                                                                                     |
| 15  | Venues and people look invented                                                             | **Kept, and true.** The Venues are in OpenStreetMap under those names; the first names are those of the specification's scenarios; both are marked in the data                                                                                                                   |
| 16  | The three options have the same weight                                                      | **Kept.** They are three of one kind; what differs is said in the name, the line and the measures. A question for the owner on the walk                                                                                                                                          |
| 17  | "Поровну" may be misread; the segments and the switch look alike                            | **Kept.** The word is whole and means "evenly"; segments and a switch are the system's own controls                                                                                                                                                                              |
| 18  | The Profile runs under the bar of destinations                                              | **Kept.** It scrolls, and fades where it goes on                                                                                                                                                                                                                                 |
| 19  | The verdict chip is weak in the sun theme                                                   | **Kept, measured.** In the sun theme the verdict has a definite edge and its text holds 7 : 1                                                                                                                                                                                    |
| 20  | "Behind the plan" is told by orange text alone                                              | **Corrected.** It has a sign as well; the words already said it                                                                                                                                                                                                                  |
| 21  | The console's marks carry colour                                                            | **Kept.** Each mark has a word                                                                                                                                                                                                                                                   |
| 22  | The chips of the Interests                                                                  | No finding: "consistent"                                                                                                                                                                                                                                                         |

What the reviewer did not look at, by its own account: the other states of the web and of the console, and most screens in dark, in the sun theme, in English and on Android. Those are measured in every theme and language by the check of the screens, and are the owner's to see on the walk.

## Stage S1, package by package

Every package of stage S1 in the work plan was read against the registry of the screens, the functions that draw them and their words. Most packages build nothing a person sees. Of those that do, the screens of `D-03` and `D-04` covered the solo Outing closely; what was missing has been drawn here.

| Package                                             | What it builds that was not drawn                                                                                                                                                            | Drawn as                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `S1-OUT-04`, `-13`, `-14`, `-16`, `-17`             | The prompts of the trigger rules: "tell me on the way", "walked past", out of order, a manual Place; far from the start; a Place that closes early; a long way back; marking a Place by hand | `prompts` in six states; `stray` / far; a row of `menu`                                                |
| `S1-OUT-13`                                         | Pause and resume                                                                                                                                                                             | `walk` / paused                                                                                        |
| `S1-OUT-14`                                         | "More" blocks; a Story not yet verified; a Place closed for a time                                                                                                                           | `story` / more, unverified; `place` / closed                                                           |
| `S1-RTE-07`, `S1-RTE-14`                            | The other edge cases of a request; where; Travel Mode; leaving out unknown hours; no location permission                                                                                     | `options` / closed, nowhere; `request` with three more rows, and / nopermission                        |
| `S1-RTE-15`                                         | Renaming and deleting a Route; rebuilding round pinned Places; similar Places; a Place from the map; a Custom Place                                                                          | `routes` / manage; `edit` / custom, add, and its third action; `place` / replace                       |
| `S1-FBK-04`                                         | A Correction about the data of a Place                                                                                                                                                       | `place` / wrong                                                                                        |
| `S1-FBK-03`                                         | "Liked or not" at the end of a Story on the web                                                                                                                                              | `web-story` / ended                                                                                    |
| `S1-ACC-04`, `-05`, `-06`, `-11`                    | A code that expired, too many attempts, a request that waits for a network; the Profile merged field by field; a Guest deleting their data                                                   | `sign-in` / expired, locked, offline; `guest` / conflict; `delete-account` / guest; a row of `profile` |
| `S1-ACC-05`, `S1-FBK-05`                            | The letter with the code; the two notifications as the system shows them                                                                                                                     | `mail`; `lock` / push                                                                                  |
| `S1-RTE-13`, `-14`, `-15`, `S1-ACC-07`, `S1-FBK-05` | Pages named "on the app and the web"                                                                                                                                                         | `web-options`, `web-routes`, `web-profile`, `web-notifications`                                        |
| `F-03`                                              | "Update required" on each of the three clients                                                                                                                                               | `web-update`, `console-update` (the phone's was drawn in `D-03`)                                       |
| `S1-OPS-06`, `S1-OPS-07`                            | The operations view: allowances and budgets with their reset dates, the last runs, the backlogs, the first rehearsal                                                                         | `console-operations`                                                                                   |
| `S1-CUR-01`, `S1-ACC-03`                            | Signing in to the console, and the refusal of a person without a role or with the wrong one                                                                                                  | `console-sign-in` / usual, refused, wrongrole                                                          |
| `S1-PLC-03`, `S1-PLC-17`                            | The list of Places; Territories with no Entrance; the list of Key Places                                                                                                                     | `console-places` / usual, keys, flagged, empty                                                         |
| `S1-CUR-02`, `S1-CUR-03`                            | Parking points; marks on names; two weeks of resolved hours; splitting a Place; an undo refused                                                                                              | `console-place` / access, split; `console-changes` / refused                                           |
| `S1-CUR-04`, `S1-PLC-08`                            | Filters and order; accepting a low-risk group; a run held, released or discarded                                                                                                             | `console-changes` and its state held                                                                   |
| `S1-CUR-05`, `S1-PLC-11`                            | Fragments of websites with "enter hours" and "dismiss"; Places to check in person; the interval and the runs of a Freshness Check                                                            | `console-sources` / sites, checks                                                                      |
| `S1-CUR-08`, `-09`, `-10`                           | Theme scores, names with their origin, a contradiction between sources; a word fixed in one Story; "accept without change"                                                                   | `console-dossier` / scores; `console-pronunciation` / override; `console-corrections`                  |
| `S1-CUR-11`                                         | Opening and closing an area to a Curator                                                                                                                                                     | `console-preparation` / areas                                                                          |
| `S1-CUR-12`, `S1-FBK-07`                            | Coverage by city and region, areas reviewed by nobody, freshness by area and kind; the measures over time                                                                                    | `console-dashboards` / coverage, product                                                               |
| `F-11`, `S1-ACC-03`                                 | The rate limits an Administrator changes; the filters of the audit log                                                                                                                       | `console-admin` / limits, audit                                                                        |

**Where the mockups and a package said different things**, the package was followed and the reading recorded in the [screens' README](../screens/README.md#how-the-specification-was-read): Travel Mode is a row of the request; leaving out Places with unknown hours is a switch of the request; signing in by e-mail without a network waits instead of being refused; the Place editor shows two weeks of resolved hours beside the value the map has; in stage S1 deleting an account lists what stage S1 has. "Drag to reorder" stands as it was drawn: a row is dragged, and two keys do the same.

**Not drawn, on purpose:**

- The planner's timing screen (`S1-OUT-07`), the export of the device's log (`S1-OUT-22`) and the reachability page (`S1-OPS-05`): tools of the check on real phones, not screens of the product.
- The alerts to Administrators (`S1-KNW-02`, `S1-PLC-08`, `S1-OPS-06`): plain text through the outbox.
- A doubtful match as "two records on a map" (`S1-CUR-05`): it is a table with the distance between the two; the Place editor has the map.
- The history of a Place inside the Place editor: it is on the screen of Proposed Changes, where it is undone.
- A Proposed Change from a website with a real fragment of its page: the research keeps no fragment, so the fragment is the value the map has, marked as a sample of the form.

## The export of approved screens

`design/tools/export-approved.mjs` photographs every screen in every state and system, alone and at its exact size, with a headless Chrome, and writes them under [`design/approved/`](../approved/README.md) with an index: 401 drawings, light theme, Russian, one pixel to a point, as WebP — about a tenth of a megabyte each at most. It was run on the day of the approval. A run that is cut short goes on where it stopped; `--fresh` photographs everything anew, which is what a change approved later asks for.

```sh
pnpm design                                # in one terminal
node design/tools/export-approved.mjs      # in another
```

## The owner's approval

**Approved on 26 November 2026.** The owner opened the walks on a phone over the local network, went through them, and approved the design as it stands: "Мне всё понравилось". No remark was made, so nothing was sorted into a change of design or a question about the specification.

What the approval covers: every screen of the registry in every state — the screens of `D-03`, `D-04` and `D-09` and what this package added — as exported to [`design/approved/`](../approved/README.md) on that day.

What was put to the owner with the walks and drew no remark: the small secondary text in daylight, the words of the first screen, the equal weight of the three Routes offered, and the plainer Android. The readings of the specification in the [screens' README](../screens/README.md#how-the-specification-was-read) stand as written.

What was not reported, and so is not claimed here: on which phones the walk was made and whether outdoors; and a first-time walk — no one who had never seen the product is known to have gone through SC-1, and no stumble was recorded. The first-time mode stays in place for it: a stumble found later is a change to the screens, exported again.
