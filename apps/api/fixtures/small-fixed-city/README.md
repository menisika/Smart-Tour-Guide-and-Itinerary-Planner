# The small fixed city

**PLACEHOLDER — nothing is here yet.**

ADR-0027 (point 11) and ADR-0030 (point 13) ask the local environment to build "a small fixed city": a tiny, unchanging set of source records from which the base of Places is gathered and matched, so that the tests of the base — and later of change records and Freshness Checks (ADR-0031) — run against the same input every time, with no network and no real source.

This folder is where that input will live. When the batch job that builds the base of Places exists, this folder gets:

- one small file per source, in the format the source's test double reads;
- the expected outcome — the Places, their identifiers, the match decisions — for the tests to compare against.

Two things are already decided by the records and bind whoever fills it:

- **A city is data.** Nothing in the code names a city or a country; the fixture is loaded like any other city.
- **No data of a person.** The fixture holds records about places only.

The folder is not copied into the container image yet; add it to `files` in `apps/api/package.json` when a job reads it.
