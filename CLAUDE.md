# Promenade

A planner of city outings; this is its monorepo. One developer owns it, and Claude sessions write the code.

## Where to look

- **Starting any task** → [docs/WORK-PLAN.md](docs/WORK-PLAN.md): take a work package whose dependencies are done. It names the requirements and decisions to read first.
- **A capitalised term** (Place, Route, Outing, Party, Dossier, Story…) → [GLOSSARY.md](GLOSSARY.md); use each term in exactly that sense.
- **What the product must do** → [docs/PRODUCT-SPEC.md](docs/PRODUCT-SPEC.md), by requirement ID.
- **Why something is built the way it is** → [docs/adr/](docs/adr/README.md).
- **How the repository works and how each architecture rule is enforced** → [docs/development.md](docs/development.md).
- **Committing, branching, opening a pull request** → [CONTRIBUTING.md](CONTRIBUTING.md). A commit message ends with its `Refs:` line: leave out the `Co-Authored-By` line and any other attribution.

## Rules no tool checks

- Documents and code comments are in English. Talk to the owner in Russian.
- The specification, the decision records and the glossary change only when the owner asks. When a decision turns out impractical, stop and tell the owner.
- A city is data: cities and countries appear in data and fixtures of data, never in code or tests.
- An account, a cloud resource or a paid call is the owner's decision, each time.
- The work plan has no dates and is a floor: where something can and should be better, make it better and record it in the plan's improvement log.

## Pushing

`origin` is reached through the SSH alias `github-mac`. When `ssh -o BatchMode=yes -T git@github-mac` does not greet the owner's account, stop and ask the owner to load the key. Pull requests are opened under the owner's account: push the branch and hand over the link.
