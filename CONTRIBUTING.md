# Contributing

How a change gets into this repository. There is one developer, and Claude sessions do the writing, so the rules are few and tools enforce what they can.

## The flow

`main` is the only long-lived branch and is always green.

1. **One piece of work, one branch, one pull request.** A piece of work is normally one work package of [docs/WORK-PLAN.md](docs/WORK-PLAN.md).
2. **Name the branch** `<type>/<work-package-id>-<short-slug>`, for example `feat/s1-rte-03-verifier`. Work outside the plan: `<type>/<short-slug>`.
3. **Title the pull request as a commit header** (see below). It becomes the one commit on `main`: pull requests are squash-merged and the branch is deleted.
4. **Merge when the three checks pass:** `Lint and tests`, `Compose smoke test`, `Terraform format and validation`. No review by a second person is required; the owner merges.

Parallel sessions each work in their own worktree, on their own branch.

**Why pull requests for one developer.** Every change must pass automated checks before it reaches `main` (`NFR-38`, ADR-0002); on GitHub that is a required check on a pull request. A pull request is also the unit a session hands over, a reviewer reads, and a `git revert` undoes. Release branches and a `develop` branch would add nothing: there is one deployable, built from `main`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), kept short. The `commit-msg` hook checks every rule below with commitlint ([commitlint.config.mjs](commitlint.config.mjs)).

```
type(scope): subject

Optional body: why the change was needed.

Refs: S1-RTE-03
```

- **Header** — at most 72 characters; the subject starts in lower case, is in the imperative ("add", not "added"), and has no full stop.
- **Type** — one of:

  | Type       | For                                    |
  | ---------- | -------------------------------------- |
  | `feat`     | new behaviour                          |
  | `fix`      | a defect corrected                     |
  | `docs`     | documents only                         |
  | `refactor` | structure changed, behaviour unchanged |
  | `test`     | tests only                             |
  | `perf`     | faster or lighter, behaviour unchanged |
  | `build`    | the image, the build, dependencies     |
  | `ci`       | the pipeline                           |
  | `chore`    | upkeep that fits none of the above     |
  | `revert`   | undoing an earlier commit              |

- **Scope** — required; the part of the repository that changed: `api`, `mobile`, `console`, `contracts`, `planner`, `verifier`, `routing`, `triggers`, `i18n`, `tools`, `infra`, `docker`, `ci`, `docs`, `design`, `spikes`, `deps`, or `repo` for what belongs to no single part.
- **Body** — optional. It says _why_, never what the diff already shows. At most 600 characters, lines of at most 100.
- **Trailers** — `Refs:` with the work package or requirement the commit serves. A `Co-Authored-By:` line is accepted.

One commit holds one logical change. A header that needs "and" is two commits.

| Accepted                                             | Rejected, and why                                  |
| ---------------------------------------------------- | -------------------------------------------------- |
| `feat(planner): add the candidate preselection rule` | `feat: add preselection` — no scope                |
| `fix(api): close the pool on shutdown`               | `fix(api): Closed the pool.` — capital, full stop  |
| `docs(docs): describe the recording format`          | `update(backend): things` — unknown type and scope |

## Hooks

`pnpm install` installs the hooks (Husky). They run the same tools as the pipeline, earlier.

| Hook         | What it runs                 |
| ------------ | ---------------------------- |
| `pre-commit` | Prettier on the staged files |
| `commit-msg` | commitlint                   |
| `pre-push`   | `pnpm lint` and `pnpm test`  |

When a hook is wrong, fix the hook in a commit of its own; `--no-verify` leaves the next person with the same wrong hook.

## What the owner decides

- Any change to [the specification](docs/PRODUCT-SPEC.md), [a decision record](docs/adr/README.md), [the glossary](GLOSSARY.md) or `CONCEPT.md`.
- Anything that costs money or creates an account or a cloud resource.
- Repository settings on GitHub, and every merge into `main`.
