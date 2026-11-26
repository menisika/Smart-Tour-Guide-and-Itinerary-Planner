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

`origin` is reached through the SSH alias `github-mac`. When `ssh -o BatchMode=yes -T git@github-mac` does not greet the owner's account, stop and ask the owner to load the key. A session carries its work to `main` itself: it pushes the branch, opens the pull request, merges it by squash once the three checks pass, and reports. It never merges with a check failing and never goes round the rules of `main`.

`gh` on the owner's machine holds two accounts, and the active one is not this repository's. Take the repository's token for each command and leave the active account alone (no `gh auth switch`):

```sh
GH_TOKEN=$(gh auth token --hostname github.com --user menisika) gh pr create -R menisika/Smart-Tour-Guide-and-Itinerary-Planner …
```

When that token is missing, or `gh api user --jq .login` under it is not `menisika`, stop and ask the owner to log the account in.
