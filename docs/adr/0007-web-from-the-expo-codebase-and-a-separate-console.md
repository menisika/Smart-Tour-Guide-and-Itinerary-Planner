# 0007. Web: the public web from the Expo codebase, the console as a separate application

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — the web's server build runs inside the API's container. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #2 "Web client and console" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `EDT-7`, `CAT-1`, `PTY-3`, `PTY-13`, `NTF-4`, `OUT-20`, `ACC-9`, `CUR-1…11`, `NFR-27`, section 6, constraint 5 of §10.1 |

## Context

- Section 6 of the specification gives the web nearly everything the app does — answering an Invitation, voting, Chat, requesting and editing a Route, the Catalog, playing a Story by hand — and withholds only the Outing with automatic Stories and work without a network.
- A Route Page and an Invitation are opened from messengers, so their links need a preview and a fast first screen (`EDT-7`, `PTY-3`).
- The internal console must be unreachable for Guests and Users (`ACC-9`); with it alone a Curator brings a city to reference quality (`CUR-*`, SC-5).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Expo Router in SDK 58 renders pages on the server on each request (`web.output: "server"`); a route can export `generateMetadata` to emit Open Graph tags. | [server rendering](https://docs.expo.dev/router/web/server-rendering/) |
| The server build runs behind an Express adapter, that is, as an ordinary Node.js container. | [API routes, deployment](https://docs.expo.dev/router/web/api-routes/) |
| The behaviour of `web.output: "server"` changed between SDK 57 and SDK 58. | Expo Router migration guide |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Public web from the Expo codebase; console separate** | The screens the web shares with the app are written once; one developer | Server rendering in Expo is younger than in Next.js; accessibility on `react-native-web` takes discipline |
| **B. Next.js for the public web; console separate** | The most mature server rendering and semantic HTML; widely recognised | Almost the whole product interface is written twice; only logic is shared |
| **C. One Next.js application for web and console** | Fewest deployables | The same duplication, and the console shares an origin and a bundle with the public site |

## Decision

Option A.

1. **The public web is the web target of the `mobile` application.** Screens are shared; behaviour that a browser cannot have (background location, Route Pack) is absent there, and what needs a network is shown as unavailable rather than hidden.
2. **Route Pages and Invitation pages are rendered on the server** with link-preview tags. The web's server build is mounted inside the API's container through the documented Express adapter, so a page opened from a messenger pays for one cold start, not two ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)).
3. **The map on the web** is MapLibre GL JS behind the same component interface as the native map ([ADR-0008](0008-maps-openstreetmap-pmtiles-and-maplibre.md)).
4. **The console is its own application** (`console`): a desktop-first React single-page application, served as static files from its own origin on Firebase Hosting. It holds tables, the Dossier editor, the pronunciation editor with playback and the map editor for Territory boundaries.
5. **Access to the console (`ACC-9`)** is enforced by the API: every console endpoint requires an internal role and refuses and logs anything else. The separate origin keeps console code out of the public bundle; it is not the security boundary.
6. **Accessibility (`NFR-27`)** is checked automatically on the web build against WCAG 2.2 level AA, and by hand with a screen reader per stage.

## Consequences

- One codebase carries three targets; platform differences live in platform-specific files, not in separate applications.
- If server rendering in Expo proves unreliable, the fallback is static output plus a small endpoint that serves preview tags for Route Pages and Invitations; the screens do not change.
- The console shares packages (`contracts`, `i18n`, API client) but no screens with the product.

## Not verified

- First-load weight and time of the Expo web build on a phone browser opened from a messenger.
- That WCAG 2.2 AA is reachable on every shared screen without web-specific rewrites.
