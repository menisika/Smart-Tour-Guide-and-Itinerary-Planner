# 0015. Interests: a fixed list of themes with scores computed once per Place

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — a deterministic fallback score for Places that have not been prepared. See [what changed](README.md#changes-after-the-independent-review) |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: a popularity value is stored beside the theme scores. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Fork** | #14 "Representing interests" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `PRF-2`, `RTE-3`, `RTE-9`, `RTE-14`, `EDT-4`, `KNW-10`, `NFR-2`, `NFR-4`, `OUT-9…11` |

## Context

- Interests are a fixed list of 10–12 themes, each marked like, neutral or dislike (`PRF-2`).
- Language models may score how well a Place fits an interest; they never decide composition or order (`RTE-3`).
- Planning must be reproducible, fast, and possible on the device without a network (`NFR-2`, `NFR-4`, `OUT-9…11`).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Themes only, scores computed once in Preparation** | No model call when a Route is planned; reproducible; works offline; explanations fall out of the same numbers | Coarser than semantic similarity |
| **B. Themes plus embeddings and a vector index** | Finer matching of a Wish to Places; subtler "similar" suggestions | Another model and another source of irreproducibility to control; no requirement of S1–S3 fails without it |

## Decision

Option A.

1. **Each Place has a score per theme**, computed once during Preparation by the language model from the Dossier and the source tags, and adjustable by a Curator. A Place that has not been prepared yet has a deterministic score derived from its kind and tags, so a Route can be built before any Preparation (`RTE-17`); the model's score replaces it in a later version of the city data.
2. **Scores are stored with the model version in the published version of city data** ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)). Planning reads them; it calls no model.
3. **A Profile is a weight per theme** (like, neutral, dislike); a Wish, once interpreted ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)), adjusts weights and constraints for one request.
4. **"Why it is here" (`RTE-9`)** names the themes that contributed most to a Place's score in this Route.
5. **"Replace with similar" (`EDT-4`)** ranks candidates by closeness of theme scores, kind and distance, among Places that keep the Route feasible.
6. **"More" blocks (`KNW-10`)** are tagged with themes from the same list.
7. **A popularity value per Place** — an integer derived from the monthly views of its articles, where it has any, read together with its kind ([ADR-0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md)) — is stored beside the theme scores in the city version. It orders the Curator's queue (`CUR-1`) and takes part in the preselection of candidates ([ADR-0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md)). It tells apart the most viewed quarter of Places and is treated as equal below that.

Embeddings and vector search are not introduced. They would look good in a list of technologies, but on S1–S3 no requirement fails without them.

## Consequences

- Changing the list of themes is a data migration: every Place is re-scored.
- Scores from a new model version produce a new version of city data; Routes built on the old version stay reproducible against it.
- If Profile suggestions (`PRF-8`) or influence of ratings (`FBK-5`) later need similarity between people or Places, this decision is revisited then.
