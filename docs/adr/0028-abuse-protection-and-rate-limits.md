# 0028. Abuse protection and rate limits

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Origin** | Not one of the 22 forks; raised by the independent review: `NFR-31` had no home. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `NFR-31`, `NFR-22`, `NFR-34`, `PTY-3`, `PTY-6`, `PTY-12`, `KNW-23`, `ACC-9` |

## Context

- "Invitation links and Preparation are protected against abuse by rate limits and quotas" (`NFR-31`).
- An Invitation is answered in a browser without an account (`PTY-3`); a Guest costs nothing to create.
- Several endpoints spend money on each call: Wish interpretation, Preparation, the e-mail code ([ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
- There is no free in-memory store shared between instances on the chosen cloud, and a paid traffic-filtering service is outside the budget.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Limits in the process for cheap paths, counters in the database for costly ones, budgets as the last line** | Nothing new to run; the costly paths are exact | In-process limits are per instance |
| **B. A shared in-memory store for all limits** | Exact everywhere | No free tier; an always-on service |
| **C. A managed traffic filter** | Stops floods before they reach the API | Paid; does not know about Parties or quotas |

## Decision

Option A.

1. **Limits attach to the person's identifier** — Guest or User ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md)) — and, where there is none yet, to the network address coarsely.
2. **Cheap endpoints are limited in the process.** While the API is one instance ([ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)) that is exact; with more instances it is approximate, which is acceptable for cheap work.
3. **Costly endpoints are counted in the database, in the transaction that does the work:** Wish interpretation, Route requests, Preparation requests (the quotas of `KNW-23` in S5 are the same mechanism), e-mail codes, answers to an Invitation.
4. **Invitation tokens are unguessable and revocable.** Replacing the link invalidates the old one; a removed member's access ends with it (`PTY-12`). A Party has at most ten members (`PTY-6`).
5. **A Guest is created only at the first action worth remembering**, so merely opening pages creates nothing to limit or to store.
6. **The monthly budgets are the last line:** if abuse gets through, paid work stops at the budget instead of running up a bill (`NFR-22`).
7. **The console** refuses and logs every request without an internal role (`ACC-9`).

## Consequences

- A flood of cheap requests can still wake instances and use free instance hours; that is visible on the cost dashboard and is the trigger for reconsidering option C.
- Attesting that requests come from the real app is not introduced now; it is the next step if Guests are abused.
