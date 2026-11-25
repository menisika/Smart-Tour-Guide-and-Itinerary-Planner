# 0019. Identity: Firebase Authentication, a Guest that upgrades in place, roles and audit in our database

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — Guests are created at the first remembered action; registration is recorded in our database; deletion reaches events and backups. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #15 "Identity and access" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `ACC-1…9`, `PTY-3`, `PTY-5`, `NFR-15`, `NFR-31`, `NFR-33`, `NFR-34` |

## Context

- A person uses the product without an account; on registration the Guest's Profile, Routes and history move into the account without loss or duplicates (`ACC-1`, `ACC-2`, `ACC-4`).
- A Guest Participant answers an Invitation in a browser, votes and uses the Chat (`PTY-3`), so the server needs an identity for a person who has no account.
- Sign-in is by e-mail one-time code, Google or Apple (`ACC-3`).
- Internal roles are granted per person; every action taken with one is audited; the console is unreachable without one (`ACC-7…9`).

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| Firebase Authentication has anonymous users that upgrade to a permanent account by linking, sign-in with Google and Apple, and e-mail link sign-in. 50 000 monthly active people are free. | [Firebase Auth](https://firebase.google.com/docs/auth), [pricing](https://cloud.google.com/identity-platform/pricing) |
| No first-party e-mail one-time *code* method was found in Firebase. | absence, not proven |
| A Firebase user counts as anonymous unless it has a password or a linked provider; an e-mail address alone does not change that. Anonymous accounts older than 30 days can be removed automatically. | Firebase JS SDK source (`reload.ts`); [anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth) |
| The Auth emulator covers anonymous users, e-mail link, custom tokens and an emulated Google sign-in. | [Auth emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) |
| Better Auth, a TypeScript library, offers anonymous users with linking, social sign-in and an Expo integration inside one's own API and database. | [Better Auth documentation](https://github.com/better-auth/better-auth) |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Firebase Authentication** | Credentials handled by a managed service; the anonymous user *is* the Guest; first-party emulator; free at the design load | E-mail code needs a module of ours; one more thing tied to Google |
| **B. Better Auth inside the API** | Everything in our database; e-mail code, anonymous users and social sign-in in one library; no emulator needed | Sessions and tokens become our responsibility — security-critical code run by one developer; a younger library |
| **C. A self-hosted identity server** (Keycloak, Zitadel) | Standard protocol, ready administration | An always-on service: against `NFR-34` and constraint 5 |

## Decision

Option A.

1. **A Guest is an anonymous Firebase user**, created silently at the first action the server must remember — an answer to an Invitation, a saved Route, a Correction — and not when a page is merely opened. Its identifier is the Guest's identity on the server — for Party answers, Chat, rate limits (`NFR-31`) and the journal.
2. **Registration upgrades that user in place.** The identifier does not change, so everything recorded under it stays attached; nothing is copied (`ACC-4`). Whether a person is registered is recorded in our database, not inferred from Firebase: a user upgraded through our e-mail module can still look anonymous to Firebase, whose automatic removal of old anonymous accounts therefore stays off until the upgrade is shown, on the emulator, to leave the anonymous state.
3. **Google and Apple** are linked to the anonymous user by Firebase's own linking.
4. **E-mail one-time code is a small module of the API:** it creates a code, sends it, checks it with limits on attempts and lifetime, and on success attaches the verified address to the same user as a permanent credential and issues a Firebase token. `ACC-3` stays as written. If the address already belongs to another account, the person is signed in to that account and offered the merge of point 5.
5. **Signing in to an existing account from a device that holds Guest data** asks whether to merge; merging never overwrites newer data silently (§4.1 rule).
6. **Internal roles live in our database** and are mirrored into the token for convenience; the database is authoritative. Every console endpoint checks the role, and refuses and logs anything else (`ACC-9`).
7. **The audit record is written in the same transaction as the action it describes** — who, what, when, on what (`ACC-8`). The audit log is append-only.
8. **Deleting an account** is one durable workflow in the worker ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md)): it removes the Firebase user, applies the rules of §4.1 to the person's data, deletes files the person uploaded, and destroys the key under which the person's product events are pseudonymous ([ADR-0021](0021-observability-opentelemetry-and-an-own-event-pipeline.md)). Backups age out on their fixed retention; logs carry a hash, not the identifier. A test proves that no personal record remains retrievable through any API (`ACC-6`).

## Consequences

- The API verifies a Firebase token on every request and never sees a password; there are none.
- E-mail delivery is a dependency of sign-in by code. In the cloud it is switched on when a domain is bought; until then sign-in by code works in the local environment and the cloud deployment offers Google ([ADR-0020](0020-notifications-outbox-fcm-and-e-mail-behind-a-port.md), [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
- Two separate Guests on two devices remain separate until one registers, as the specification states.
- Sign-in with Apple on a real iPhone probably needs the paid Apple Developer Program ([ADR-0023](0023-distribution-stores-deferred.md)).

## Not verified

- Whether Sign in with Apple is available to a free Apple "Personal Team".
- That upgrading an anonymous user through our e-mail-code module behaves on the emulator exactly as in the cloud.
