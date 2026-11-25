# 0023. Distribution: stores deferred; free channels until a launch is planned

| | |
|---|---|
| **Status** | Deferred — the owner confirmed on 23 November 2026 that app stores are not decided now. The interim channels below are accepted. |
| **Fork** | #21 "Distribution" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | §1.5 (not in production; minimal spend), §7.4, §9.3; touches `NTF-1`, `NTF-2`, `ACC-3` |

## Context

- The product is not in production and takes no money (§1.5). The owner's ceiling for all spending is USD 20.
- Whether store accounts and payouts work for a developer based in Belarus was unconfirmed in three research reports (§9.3). The owner can also register as a resident of Poland.

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| Google Play: developer registration and payouts are supported for Belarus and for Poland; USD 25 once. A new personal account must run a closed test with at least 12 testers for at least 14 days before production. | Google Play Console help |
| Apple Developer Program: USD 99 a year. Apple publishes no list of countries; an enrolment from Belarus is reported stuck (forum, April 2026); no restriction was found for Poland. | Apple Developer Program pages; Apple Developer Forums |
| Without the paid programme an app can be installed on one's own iPhone through Xcode on a Mac, signed for seven days. Push Notifications are not available to such a "Personal Team". | [Expo documentation](https://docs.expo.dev/develop/development-builds/introduction/); Apple Developer Forums |
| TestFlight and any cloud-built installation on an iPhone need the paid programme. | Expo and Apple documentation |
| Installing an APK directly on Android is free. From January 2027 Android verifies developers for directly installed apps too; a free limited account covers up to 50 devices. | Android developer verification announcement |

Both store accounts cost more than the owner's ceiling.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Defer the stores; use free channels** | USD 0; nothing is decided on unverified facts | iPhone push and probably Sign in with Apple cannot be exercised on a real iPhone; iPhone testers other than the owner cannot receive a build |
| **B. Buy the Google Play account now** | A proper test channel for Android; starts the mandatory closed test | USD 25, above the ceiling; opens nothing on iPhone |
| **C. Buy the Apple Developer Program now** | Push, Sign in with Apple and TestFlight on iPhone | USD 99 a year, five times the ceiling |

## Decision

Option A, with the store decision deferred to launch planning.

1. **Android:** the pipeline builds an APK on every release; it is installed directly on test phones.
2. **iPhone:** the app is built on the owner's Mac and installed on the owner's iPhone with free signing, renewed every seven days.
3. **Web:** public, and a full client for everything except the Outing with automatic Stories and work without a network (§6).
4. **Recorded limitation for S1 and S2 (§7.4):** push notifications (`NTF-1`, `NTF-2`) and, pending verification, Sign in with Apple (`ACC-3`) are accepted on Android and on the web only. The requirements do not change.
5. **The device check of [ADR-0005](0005-mobile-client-expo-and-a-typescript-monorepo.md)** — location, audio, planner, offline map — needs none of the paid capabilities and proceeds on both phones.

## What reopens this decision

- A launch is being planned (together with the register of §9.3), or
- iPhone testers other than the owner are needed, or
- the owner raises the spending ceiling.

At that point the open questions are: which country the store accounts are registered in; whether payouts work for it; and whether distribution outside the stores is wanted in the first market.

## Not verified

- Apple enrolment and payouts for either country of residence.
- Whether Sign in with Apple and Associated Domains (links that open the app) are available to a free Apple account.
- Eligibility of other stores (RuStore, AppGallery, Galaxy Store).
- How the Android developer verification of 2027 treats the owner's situation.
