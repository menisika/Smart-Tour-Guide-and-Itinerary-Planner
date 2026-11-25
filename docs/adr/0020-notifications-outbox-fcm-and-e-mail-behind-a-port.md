# 0020. Notifications: intents in an outbox, push through Firebase Cloud Messaging, e-mail behind a port

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — delivery happens inside the request and on the hourly trigger; e-mail in the cloud waits for a domain. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #19 "Notifications" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `NTF-1…5`, `NFR-11`, `NFR-17`, `NFR-23`, `NFR-33`, `NFR-34` |

## Context

- The app notifies about Stories being ready and the outcome of a Correction (`NTF-1`), and Party members about answers, options, the choice, a reminder and Chat messages (`NTF-2`).
- A Guest Participant may leave an e-mail address for the chosen option and the reminder (`NTF-3`); the page behind an Invitation link always shows the current state (`NTF-4`).
- Each kind of notification can be switched off (`NTF-5`).

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| Firebase Cloud Messaging is free and belongs to the Firebase project already in use. | Firebase documentation |
| Push Notifications are not available to a free Apple "Personal Team". | Apple Developer Forums; Apple's capability table was not readable |
| Transactional e-mail services have free tiers (Resend: 3 000 messages a month; Brevo: 300 a day). | third-party reviews, not provider pages |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. An outbox, Firebase Cloud Messaging for push, e-mail behind a port** | No intermediary sees content beyond the platform's own service; free; the e-mail provider is replaceable | iPhone push waits for a paid Apple account |
| **B. Expo's push service** | One interface for both platforms; simpler device tokens | An intermediary sees notification content; one more external dependency with unchecked country terms |
| **C. A plus web push for browser Guests** | Reaches Guests without the app | Not required: `NTF-3` and `NTF-4` already serve them. No requirement fails without it |

## Decision

Option A.

1. **The intent to notify is written to an outbox table in the same transaction as the change that causes it.** It is delivered inside the same request, right after the transaction commits; what fails, and what is due later, is picked up by the hourly trigger of [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md). A reminder is therefore not lost when a provider is briefly down (`NFR-11`). There is no background handler: the platform gives a service no processor time after it has answered.
2. **A `Notifier` port has three channels:**
   - *push* — Firebase Cloud Messaging; Android from S1, iPhone once an Apple Developer Program membership exists ([ADR-0023](0023-distribution-stores-deferred.md));
   - *e-mail* — for sign-in codes from S1 ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md)) and for Guest Participants from S2 (`NTF-3`); the provider sits behind the port and is switched on in the cloud when a domain is bought; locally a mail catcher receives everything (`NFR-33`);
   - *the page itself* — the Invitation page and the app read the current state from the API, so nothing depends on a notification having arrived (`NTF-4`).
3. **Preferences per kind of notification** are stored per person and checked before delivery (`NTF-5`).
4. **A notification carries the minimum** — what happened and where to look — and never a position (`NFR-17`).
5. **Scheduled notifications** (the reminder before an Outing) are outbox entries with a due time, picked up by the hourly trigger; a reminder is therefore accurate to the hour.

## Consequences

- Until an Apple membership is bought, `NTF-1` and `NTF-2` are accepted on Android and on the web, and the limitation is recorded for the stage (§7.4).
- Sending e-mail to arbitrary addresses in practice needs a domain of our own. The owner deferred buying one (23 November 2026): until then sign-in by e-mail code and e-mail to Guests work in the local environment only, and the limitation is recorded for the stage.
- A Chat message reaches a connected member through the real-time channel and a disconnected one through push; the two paths are de-duplicated by the message's sequence number.

## Not verified

- Free-tier limits and sender rules of e-mail providers, on the providers' own pages.
- The exact Apple capability table for free accounts.
