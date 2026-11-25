# 0005. Mobile client: React Native with Expo, in one TypeScript monorepo

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026. Conditional on the device check described below. |
| **Amended** | 23 November 2026, confirmed by the owner — no Python application; the Beta status of the location interface and the audio rule are part of the device check. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #1 "Mobile client for the Outing" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `OUT-1…19`, `NFR-5`, `NFR-7`, `NFR-10`, `NFR-24`, `NFR-25`, `NFR-27`, `OUT-9…11`, constraint 5 of §10.1 |

## Context

- The Outing must run with the screen locked: continuous location under the "while using the app" permission, arrival detection on the device, Stories that start by themselves, control from the lock screen, everything in airplane mode (`OUT-1…16`, `NFR-25`).
- The owner wants Android and iPhone from the start, a modern stack and convenient development. The owner has a Mac, an iPhone and an Android phone; the main machine is Linux.
- Planning rules must be the same on the server and on the device (`OUT-9…11`).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Expo SDK 58 documents the required mode: on iOS positions come from `CLLocationUpdate.liveUpdates` and need the location background mode and the *foreground* permission; on Android a location foreground service is started while the app is in the foreground. The interface is marked Beta. | [expo-location (next)](https://docs.expo.dev/versions/latest/sdk/location-next/) |
| Apple documents `CLBackgroundActivitySession` (iOS 17+) and `CLServiceSession` (iOS 18+) for continuous updates under "When In Use"; the session must start in the foreground. | Apple Core Location documentation |
| Activating a *non-mixable* audio session while the app is in the background fails (`cannotInterruptOthers`). Lock-screen controls in `expo-audio` require the non-mixable mode. | [Apple](https://developer.apple.com/documentation/coreaudiotypes/avaudiosession/errorcode/cannotinterruptothers), [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) |
| Android 17 mutes background audio unless it plays inside a foreground service with while-in-use rights. Continuous tracking for active navigation keeps normal precise location but needs a Play Console declaration, mandatory from 27 January 2027. | Android and Google Play documentation |
| `@maplibre/maplibre-react-native` 11.5.1 is maintained by the MapLibre organisation and has offline packs and side-loading. | [repository](https://github.com/maplibre/maplibre-react-native) |
| Compose Multiplatform is stable on iOS; MapLibre Compose is Beta. Building for iOS needs a Mac. | JetBrains, MapLibre Compose, Expo documentation |

## Options considered

| Option | For | Against |
|---|---|---|
| **React Native + Expo (TypeScript)** | One language on phone, web and server; the planner, verifier, trigger rules and API contracts are shared packages; the documented location mode matches the requirement; official MapLibre binding | The trigger engine runs in JavaScript in the background (one report of starvation on iOS 27); planner speed on a phone is unmeasured |
| **Kotlin Multiplatform + Compose** | Engine and planner compile to native code; shared with a Kotlin server | The web stays TypeScript, so three languages; MapLibre binding is Beta; an ecosystem new to the owner |
| **Flutter** | Mature cross-platform UI | Dart is shared with neither web nor server; plugin support for the iOS session APIs is unconfirmed |
| **Two native apps** | Most direct access to the platform | Everything written twice; against the owner's wish and constraint 5 |

## Decision

1. **React Native with Expo**, iOS and Android from one codebase.
2. **One pnpm monorepo.**
   - Applications: `mobile` (Expo; also the public web, [ADR-0007](0007-web-from-the-expo-codebase-and-a-separate-console.md)), `api` (Node.js, NestJS — the modular monolith of [ADR-0003](0003-backend-shape-modular-monolith-with-workers.md), with the worker and the batch jobs as further entry points), `console`.
   - Shared TypeScript packages: `planner`, `verifier`, `triggers`, `routing`, `contracts`, `i18n`.
3. **The trigger rules T1–T10 are a pure function** — (state, position fix) → (new state, events) — in the `triggers` package, tested against recorded tracks. The same recordings test any later native port.
4. **Location** uses the documented session under the "while using the app" permission, started by the explicit tap of `OUT-1`. The "always" permission is never requested. The Expo SDK version is pinned, because the location interface it relies on is still Beta.
5. **Outing state and the offline journal** live in SQLite on the device (`OUT-13`, `OUT-16`).
6. **Device check before S1 is built out**, on the owner's iPhone and Android phone. It passes when, with the screen locked for an hour of walking:
   - triggers fire from the JavaScript engine without gaps;
   - a Story starts by itself from the background and the lock-screen controls work, on iOS and on Android 17;
   - other audio is lowered, not stopped, while a Story plays — or, if lock-screen controls force exclusive audio, that is recorded as a proposed change to the rule of §4.7;
   - the planner returns within the two seconds of `NFR-4`;
   - the map renders from a local file with no network.
7. **Fallback if the check fails:** the location session, the trigger engine and the audio session move into a native Expo module (Swift and Kotlin). Nothing else changes.

## Consequences

- iOS builds need the owner's Mac or a cloud build; installing on the owner's own iPhone through Xcode is free.
- Paid libraries are avoided; in particular the commercial background-geolocation plugin, which needs a licence for release builds.
- The iOS conflict between automatic start from the background and lock-screen controls is independent of the framework; it is resolved by the device check, not by this decision.

## Not verified

- Reliable automatic start of a Story from the background with lock-screen controls on iOS — Apple documents no guarantee.
- Behaviour after the person force-quits the app on iOS (forum reports only).
- Planner speed on a mid-range phone; battery use with location and audio together (no published measurement was found for `NFR-7`).
- Whether Google Play accepts the precise-location declaration for a walking Outing.
