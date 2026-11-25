# 0009. Travel times: our own pedestrian graph now, Valhalla for bicycle and car in S4

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — a sparse matrix loaded per city; a coarse start cell; city data built independently of Preparation. See [what changed](README.md#changes-after-the-independent-review) |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: a city version is built per city; the graph is cut wider than the city's boundary. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Fork** | #4 "Travel times and routing" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `RTE-4`, `RTE-18`, `OUT-9…12`, `OUT-14`, `PRF-3`, `PRF-4`, `NFR-2`, `NFR-3`, `NFR-4`, `NFR-34`, `NFR-37` |

## Context

- The planner needs walking times between 30–150 candidates and from arbitrary points — the person's position, a point picked on the map, a Custom Place (`RTE-4`, `EDT-2`, `EDT-5`).
- On the device, without a network, the app must show the way back to the Route and replan from where the person stands (`OUT-9…12`); the Route Pack carries "the local network of streets" for that (`OUT-14`).
- Times must be the same for the same data (`NFR-2`), and no always-on service may sit behind the 3-second budget (`NFR-4`, `NFR-34`).
- Bicycle and car arrive in S4 but must be in the interfaces from S1 (`NFR-37`).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Valhalla (MIT) routes pedestrians, bicycles and cars, computes many-to-many matrices and has an official container image. It has no official mobile build; a third-party one exists, of unpublished size. | [Valhalla](https://github.com/valhalla/valhalla), [valhalla-mobile](https://github.com/Rallista/valhalla-mobile) |
| The open-source edition of GraphHopper has no matrix interface; its offline use on Android is no longer supported. | [GraphHopper](https://github.com/graphhopper/graphhopper) |
| No engine documents that repeated runs give identical times; memory, start-up time and matrix latency on the Belarus extract are unpublished. | absence of documentation |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Our own compact pedestrian graph, shared routing code; Valhalla in S4** | One source of walking times on server and device; no service on the request path; reproducible; the graph in the Route Pack is a cut of the same graph | We own the rules of walkability; less refined than a mature engine |
| **B. Valhalla from S1** | Mature costing for all three modes at once | A service behind every Route request (cold start against `NFR-4`); the device still needs its own graph, so two different sources of travel time — or a third-party mobile build |
| **C. A hosted routing service** | Nothing to run | An external dependency on every request; data version not pinned (`NFR-2`); fails `NFR-11` when the provider is down |

On S1–S3 no requirement fails without a routing engine. On S4, `RTE-18` fails without one.

## Decision

Option A.

1. **Two ports with the Travel Mode as a parameter from S1** (`NFR-37`): travel times (pairs and matrices) and paths (geometry of a leg).
2. **On foot,** a compact pedestrian graph per city is built from OpenStreetMap when city data is built and is versioned with it. Costs are integers. Edges carry the attributes the planner needs — stairs for the corresponding Dealbreaker (`PRF-3`); pace scales time (`PRF-4`).
3. **The `routing` package** — shared TypeScript — computes shortest paths on that graph. It runs on the server and on the device.
4. **Times between Places** are computed in advance with the same code and stored with the city data as a sparse matrix: pairs farther apart than a walking cut-off are left out. Times from arbitrary points are computed on demand in the API process, without a separate service. City data is loaded per city, when first needed.
5. **A Route Pack** contains a cut of the same graph around the Route and its spare Places, and their matrix. Returning to the Route and replanning on the device therefore follow exactly the server's rules.
6. **In S4,** Valhalla supplies times and paths for bicycle and car behind the same ports, starting as a batch step in the city-data build; walking inside Territories stays on our graph. Whether S4 also needs Valhalla as a service at request time is decided in S4.
7. **Accuracy** is checked two ways: against Valhalla's pedestrian times on a sample, offline, in tests; and against real Outings for `NFR-3`.
8. **A start or finish taken from the person's position** reaches the server as a coarse cell (invariant 8 of §3.6); the server routes from the centre of the cell, and the device corrects the first and last leg on its own graph.
9. **City data does not wait for Preparation.** A city version — Places, graph, matrix, map — is built per city from the OpenStreetMap extract of the country; a city is an area defined as data (`PLC-8`). Dossiers and Stories arrive later and independently. This is what lets a Route be built at once in an unprepared city (`RTE-17`).
10. **The graph is cut wider than the city.** Places are taken inside the city's boundary; the graph is cut with a margin around it, wide enough that every part of the city stays connected. Cut at the boundary, Minsk's two exclaves lose the roads that join them to the city, and 32 routable Places reach nothing. The margin is data of the city. A graph of the whole country is not built: it would be 155 MB against 11.4 MB for Minsk, and a search over it about fourteen times slower by proportion.

## Consequences

- Walkability rules (which ways can be walked, how a wide street is crossed) are ours to maintain; their errors surface as deviations in `NFR-3` and are calibrated on real Outings in Minsk.
- The city graph is held in memory by API instances; its size sets a floor on instance memory.

## Not verified

- Size of a Route Pack cut of the graph, and the time of a search on a cloud instance. Measured on the developer's machine ([research report 06](../research/06-minsk-city-data.md)): the graph of Minsk is 11.4 MB, 5.4 MB compressed; a search from one point to every node of the city takes 74–86 ms, and 3–5 ms with a 3 km cut-off.
- Everything about Valhalla's footprint on the Belarus extract — deferred to S4 with the decision in point 6.
