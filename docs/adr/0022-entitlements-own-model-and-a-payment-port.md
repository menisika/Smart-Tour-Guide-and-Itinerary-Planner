# 0022. Entitlements: our own model, and payments behind a provider-independent port

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Fork** | #20 "Entitlements and payments" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `ENT-1…9`, `NFR-23`, `PTY` rule "Participants are never asked to pay", §8 |

## Context

- No money is taken now, but the product must know what is open to whom, so that charging later means connecting a payment provider and not rewriting features (§4.13).
- Features check entitlements, never the Plan by name (`ENT-2`); what a Plan grants is configuration an Administrator changes without a release (`ENT-3`); an "open access" setting grants everyone Plus until the product charges (`ENT-4`).
- For one Outing the Organizer's entitlements cover the Party (`ENT-5`); entitlements keep working offline for downloaded content, and an expired Pass stops granting even on a device that was offline (`ENT-6`).
- Payment goes through a provider-independent interface with a sandbox provider; several providers can sit side by side (`ENT-8`). Payment channels for this market are uncertain (§9.3).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Our own entitlement model and a payment port with a sandbox provider** | Exactly the shape the requirements describe; nothing external; any provider can be attached later | We write and test the model ourselves |
| **B. A subscription service** (RevenueCat or similar) as the source of truth | Store subscriptions handled for us | Store purchases need paid developer accounts; Pass by code, Party coverage and several providers side by side must still be modelled by us; availability unchecked |

No requirement fails today without Stripe, RevenueCat or any real payment provider: real payments are outside the current scope (§9.1).

## Decision

Option A.

1. **Entitlements are named capabilities and limits.** The gated ones are those of `ENT-2`: unlimited Narration, Route Packs, ask the guide, Preparation beyond the free quota.
2. **A Plan is configuration** — a named set of entitlements — stored in the database and edited in the console (`ENT-3`, `CUR-9`). "Open access" is one setting that grants the Plus set to everyone (`ENT-4`).
3. **A grant** gives a person a Plan from a start to an end, with its source: a Pass, a subscription, an access code, or the Organizer's cover for the members of one Outing (`ENT-5`, `ENT-7`, `ENT-9`).
4. **Feature code asks one question — "may this person do this?" —** through a single function. No feature mentions a Plan by name; an automated check fails the build if one does (`ENT-2`).
5. **Offline (`ENT-6`),** the device holds a snapshot of the person's entitlements, signed by the server, with the end time of each grant. The app honours it without a network and stops honouring a grant at its end time.
6. **A `PaymentProvider` port** covers starting a purchase, confirming it and receiving the provider's notifications. A successful payment produces a grant; nothing else in the system knows which provider it was. The **sandbox provider** takes no money and is the only one until launch (`ENT-8`).
7. Entitlement checks are present in every gated feature from S1 (§7.3), with open access on.

## Consequences

- Charging later is adding an adapter and switching open access off; the acceptance test of §4.13 already exercises that path with the sandbox provider.
- The device's clock decides when an offline grant ends; a clock set back is a known, accepted weakness for content already downloaded.
- Store billing, if distribution goes through stores, becomes one more adapter and is subject to the stores' rules — part of the launch decision, not of this one.
