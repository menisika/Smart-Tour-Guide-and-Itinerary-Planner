/**
 * Trigger rules T1–T10 of an Outing as one pure function (ADR-0005, point 3):
 *
 *     (state, position fix) → (new state, events)
 *
 * No clock, no I/O and no platform interface: the same function runs in the
 * app, in tests against recorded tracks, and in any later native port.
 * Positions are handled here and stay on the device.
 *
 * PLACEHOLDER: the function records the time of the last fix and emits no
 * event. The rules replace its body; its signature is the decision.
 */
export {
  advance,
  initialTriggerState,
  type PositionFix,
  type TriggerEvent,
  type TriggerState,
  type TriggerStep,
} from './advance.ts';
