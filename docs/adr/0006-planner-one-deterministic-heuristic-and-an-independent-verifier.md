# 0006. Planner: one deterministic heuristic everywhere, and an independent verifier

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — reproducibility is enforced by rules, not asserted; the planner runs in worker threads; a start from the person's position arrives as a coarse cell. See [what changed](README.md#changes-after-the-independent-review) |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: the rule that preselects candidates is written down. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Fork** | #3 "Planner and verifier" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `RTE-3…10`, `RTE-13…16`, `PTY-7`, `PTY-9`, `EDT-1`, `EDT-3`, `EDT-4`, `OUT-9…11`, `NFR-1`, `NFR-2`, `NFR-4`, `NFR-38` |

## Context

- A Route is 5–20 Places chosen and ordered out of 30–150 candidates under hard constraints (`RTE-4`): a small orienteering problem with time windows.
- The same request on the same data must give the same Routes (`NFR-2`), on the server within 3 seconds and on a mid-range phone, offline, within 2 (`NFR-4`, `OUT-9…11`).
- Every Route is checked by an implementation that shares no optimisation code with the planner (`RTE-6`).

### Facts

| Fact | Source |
|---|---|
| OR-Tools (CP-SAT) has official builds for C++, Python, Java and .NET on desktop and server platforms. There is no official Android, iOS or WebAssembly build. | [installation](https://developers.google.com/optimization/install) |
| CP-SAT is reproducible with one worker; a wall-clock limit that stops the search makes the result depend on the machine. No document promises identical output across versions or processors. | `sat_parameters.proto`; maintainer statements; the last point is an inference |
| A published iterated local search for this problem class reaches gaps of about 1–4 % to the best known solutions on 100-node benchmarks in fractions of a second, and 9.6 % on the hardest set. | [Aghezzaf & El Fahim 2016, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC5061708), tabulating Vansteenwegen et al. 2009 — a secondary source |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. One deterministic heuristic in shared code**, with CP-SAT as a reference in tests only | One implementation for server, phone and browser; identical rules for replanning offline; reproducible by construction | No proof of optimality in production |
| **B. CP-SAT on the server, a heuristic on the phone** | Proven optimum on the server; an exact solver in production | The phone needs a second planner anyway, so two implementations with different results; reproducibility across machines unconfirmed; another service on the request path |
| **C. CP-SAT only, replanning on the server** | One exact implementation | Contradicts `OUT-9…11` and `OUT-15`; would require changing requirements |

## Decision

Option A.

1. **`planner`** — a shared TypeScript package — implements an iterated local search. It runs unchanged on the server, on the device and in the browser.
2. **Reproducibility (`NFR-2`) is built in:** integer arithmetic only (seconds; fixed-point scores), a seeded generator, a budget counted in iterations and never in elapsed time, one thread, explicit tie-breaking. The result is a function of the request, the version of the city data, the versions of the place scores, the planner configuration and the option number. Floating-point numbers and the engine's transcendental functions are forbidden in `planner`, `verifier` and `routing` by an automated rule; coordinates never enter them — only precomputed integer costs and intervals ([ADR-0009](0009-travel-times-own-pedestrian-graph-valhalla-in-s4.md), [ADR-0029](0029-time-zones-and-opening-hours-as-city-data.md)).
3. **What it models:** fixed start and finish; the time budget less a buffer (`RTE-5`); time windows including those inherited from Territories; visit durations scaled by pace; Dealbreakers as hard exclusions; pinned Places as mandatory; Breaks; a penalty for monotony (`RTE-15`); the familiar-to-unusual weighting (`RTE-14`). Places with unknown hours are allowed with a warning (`RTE-13`).
4. **A Party** is planned with a lexicographic objective: first the satisfaction of the least satisfied member, then the total (`PTY-7`).
5. **Options** (`RTE-7`) come from distinct weight profiles plus a required difference from the options already produced; "another option" is the option number in the request (`RTE-8`). For a Party the options are built so that each member finds at least one that leans their way (§4.8).
6. **When nothing fits** (`RTE-10`, `PTY-9`), an exact search over the mandatory core — start, pinned Places, finish, a handful of nodes — tells which constraint to relax and by how much.
7. **`verifier`** is a separate package. It depends only on the shared description of the constraints and may not import the planner; this is enforced automatically. It runs after every plan on the server and on the device, and after every manual edit, where it lists violations (`EDT-1`).
8. **CP-SAT is not part of the product.** It solves the same generated instances exactly in the test suite, to measure how far the heuristic is from the optimum. No requirement fails without it; it is kept as a yardstick.
9. **Suites that gate every change (`NFR-38`):** at least 1 000 generated requests, all accepted by the verifier (`NFR-1`); a deliberately broken planner must be caught; ten repetitions identical (`NFR-2`); the same request with the same budget gives byte-identical output on the server's JavaScript engine and on the phone's, both of which run in the pipeline ([ADR-0027](0027-testing-strategy.md)).
10. **On the server the planner runs in worker threads** ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)); each run is still single-threaded, so reproducibility is unaffected.
11. **A start or finish taken from the person's position arrives as a coarse cell** (invariant 8 of §3.6). The server plans from the centre of the cell; the device re-times the first and last leg from the true position before the Outing starts.
12. **Candidates are preselected by a fixed rule before the search.** The area of one three-hour Outing in Minsk holds 709 routable candidates; the search works on at most 150. Pinned Places are always kept. The rest are the Places that can be reached inside the time budget from the start and the finish, ordered by their theme score for the request and their popularity value ([ADR-0015](0015-interests-fixed-themes-with-precomputed-scores.md)), with a ceiling per kind so that no single kind fills the list — half of Minsk's routable candidates are artworks. Ties are broken by Place identifier. The rule, the ceiling and the limit are part of the planner configuration that defines reproducibility (`NFR-2`).

## Consequences

- The guarantee of "no violated constraint" comes from the verifier, not from the solver being exact.
- Route quality is "good", not "proven best". The gap is measured against CP-SAT rather than assumed.
- The iteration budget is tuned for the phone; the server may use a larger one, and the budget is part of the configuration that defines reproducibility.

## Not verified

- Planning time on a mid-range phone (part of the device check of [ADR-0005](0005-mobile-client-expo-and-a-typescript-monorepo.md)).
- The heuristic's gap on our own problem shape: pins, a Party objective and a monotony penalty are not in the published benchmarks.
- The ceiling per kind and the weight of popularity in the preselection; they are set on real Routes of Minsk.
