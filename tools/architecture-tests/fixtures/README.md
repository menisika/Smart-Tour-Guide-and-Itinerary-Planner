# Fixtures: code that breaks the rules on purpose

`violations/` mirrors the layout of the repository (`apps/api/src/modules/...`,
`packages/verifier/...`) and holds the smallest files that break each import
rule of `.dependency-cruiser.cjs`, next to files that keep it.

The tests in `../src` run the real rule set over this tree and assert which
imports are reported and which are not. Nothing here is compiled, linted or
shipped; the folder is excluded from every other check.
