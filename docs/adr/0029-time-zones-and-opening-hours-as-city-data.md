# 0029. Time zones and opening hours: resolved into intervals as city data

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: the city's calendar is applied before the hours are parsed; a Place is seen from outside or visited inside. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Amended** | 24 November 2026, confirmed by the owner — with ADR-0031: an applied change to a Place also publishes a new city version. See [what changed](README.md#changes-after-the-product-narrowed-to-belarus) |
| **Origin** | Not one of the 22 forks; raised by the independent review: no record said where opening hours are evaluated. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `RTE-4`, `RTE-12`, `RTE-13`, `PLC-3`, `PLC-4`, `PLC-8`, `CUR-5`, `OUT-2`, `NFR-2`, `NFR-21` |

## Context

- Known opening hours are a hard constraint, inherited down the tree of Territories (`RTE-4`, `PLC-3`); unknown hours are a warning (`PLC-4`, `RTE-13`).
- Opening hours in the sources depend on the local date, on public holidays and on the season.
- A visitor's phone may be set to another time zone (SC-1).
- The planner and the verifier must give the same result on the server and on the device (`NFR-2`), and may not contain floating-point or locale-dependent code ([ADR-0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md)).
- A city is data, not code (`PLC-8`, `NFR-21`).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Resolve hours into absolute intervals when city data is built** | The planner sees only integers; one place interprets hours; identical on every device | A horizon to refresh; requests beyond it need a rule |
| **B. Evaluate opening-hour rules inside the planner** | No horizon | Calendar and time-zone logic in code that must be byte-identical on two JavaScript engines |
| **C. Evaluate on the server only** | Simple | Replanning on the device (`OUT-9…11`) could not check hours offline |

## Decision

Option A.

1. **A city carries its time zone and its calendar of public holidays as data**, in the published city version ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)). The calendar is what decides: rules that refer to public holidays are expanded into dates from it before the hours are parsed, because the standard parser reads holidays from a table compiled into it and cannot be given another — its table for Belarus lacks 2 January and the working days the government moves each year. Hours are evaluated in the city's time zone, whatever the zone of the process that builds them.
2. **When city data is built, the opening hours of every Place — with the rules inherited from the Territories above it — are resolved into absolute intervals** for a rolling horizon of two weeks. Unknown stays unknown and is carried as such.
3. **The planner and the verifier consume intervals only.** They contain no time-zone, calendar or opening-hours syntax.
4. **A Route Pack carries the intervals for the day of its Outing**; "will you reach the next Place before it closes" (`OUT-2`) is answered from them, offline.
5. **Instants are exchanged as absolute times; they are displayed in the city's time zone**, not the phone's.
6. **A request for a date beyond the horizon** is planned on the weekly pattern and is re-checked on the day, as `RTE-12` already requires for every scheduled request.
7. **The horizon is refreshed daily** by the single trigger of [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md), as a new version of city data only when intervals actually changed — or when an applied change to a Place of the city changed its status, its hours or anything else the planner reads ([ADR-0031](0031-keeping-the-base-of-places-current.md)). A closure therefore reaches Routes within a day of being applied.
8. **Whether a Place is seen from outside or visited inside is an attribute of the Place**, with a default by kind that a Curator can change (`CUR-5`). Unknown hours raise the warning of `RTE-13` only for a Place that is visited inside. No source carries this attribute, and without it nearly every stop would carry the warning: 96 % of Minsk's routable candidates have no opening hours, most of them buildings, monuments and parks.

## Consequences

- Adding a city means supplying its time zone and holiday calendar with its data, and nothing else.
- A change of hours reaches Routes with the next refresh; a Route Pack shows the date its hours were checked (`RTE-12`).
- Hours written in the sources in a form the resolver cannot read are treated as unknown, never guessed.

## Measured since the decision

From [research report 06](../research/06-minsk-city-data.md): 2 034 of the 2 043 opening-hours values of Minsk resolve (99.6 %), including all 27 that carry a public-holiday rule; the intervals of two weeks for 2 034 Places take 106 kB.

## Not verified

- The official list of public holidays and moved working days of Belarus for the coming year, from which the city's calendar is filled.
