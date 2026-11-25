# 0016. Bridges assembled on the device from prepared fragments; introduction and finale generated per Route

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — sensitive, unverified Places have no teaser. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #22 "Bridges, introductions, finales" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `KNW-7`, `KNW-8`, `KNW-11`, `KNW-14`, `KNW-19`, `NFR-4`, `OUT-9…11`, `OUT-15`, `NTF-1` |

## Context

- Introductions, bridges and finales are generated for a Route and are part of its Route Pack (`KNW-7`).
- Routes are returned within three seconds (`NFR-4`): nothing that needs a language model and speech synthesis can sit in front of showing a Route.
- A Route is replanned on the device without a network (`OUT-9…11`). After a skip or a shortening, the pairs of consecutive Places are new; a bridge written on the server for the old pair no longer applies and a new one cannot be requested.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Bridges assembled on the device from per-Place fragments; introduction and finale generated on the server after the Route is chosen** | A bridge exists for any pair of Places, including after offline replanning; nothing waits; no cost per Route for bridges | Bridges are less authored: no sentence ties this particular pair together |
| **B. Everything generated on the server per Route** | The liveliest text | New pairs after offline replanning have no bridge; every Route spends model and speech quota and waits |
| **C. Templates only** | Simplest; no model per Route | The introduction cannot name the theme of this Route; the guide sounds mechanical |

## Decision

Option A.

1. **Preparation of a Place also produces bridge fragments**, once, checked like any Story ([ADR-0013](0013-statement-verification-entailment-model-then-judge.md)): the spoken name of the Place and a one- or two-sentence teaser, in each language. A teaser is a Story in the sense of `KNW-14`: a Place flagged sensitive whose Dossier is not verified has no teaser, and its facts enter no introduction or finale; its bridge is a connective and the name only.
2. **A small set of connective phrases** is synthesised once per language in the guide's voice. They are non-factual by the classification of `KNW-8`.
3. **The device assembles a bridge** for the next leg — a connective, the name, the teaser, and a spoken distance or direction where the Route gives one — from fragments in the Route Pack. Fragments for the spare Places are in the Pack too, so a replanned Route has bridges.
4. **The introduction and the finale are generated on the server** once a Route is chosen, in the background, from the facts of its Places; they are checked, voiced and added to the Route Pack when ready, and the person is notified (`NTF-1`).
5. **If they are not ready, or the Route changed after they were made,** an introduction and a finale assembled from fragments are played instead. An Outing never waits for generation.
6. **Catalog Routes** (S3) have a fixed order, so bridges written for their specific pairs can be generated once and verified by a Curator. This is an extension of point 4, not a different mechanism.

## Consequences

- The cost of bridges is paid once per Place, not once per Route (`KNW-19`).
- Assembled audio must sound continuous: fragments share one voice and one loudness target, and joins are tested by ear.
- The requirement that bridges be "generated for a Route" (`KNW-7`) is met by assembly per Route on the device and by generation of the introduction and finale on the server. No change to the specification is needed.

## Not verified

- That assembled bridges are acceptable to listeners; this is judged on the reference Outing in Minsk.
- The cost per Route of introductions and finales, in tokens and characters, against the monthly budgets.
