/**
 * What the system says in sentences rather than in drawings: where iOS and
 * Android differ and why, and the accessibility rules with what checks each.
 * The page shows these tables; design/system/README.md refers to them.
 */

/** Where the two systems differ, and why. */
export const platformDifferences = [
  {
    what: 'The material of controls',
    ios: 'Liquid Glass, the system’s own material on iOS 26 and later (<code>expo-glass-effect</code>): sheets, bars, round controls, the capsule of the player.',
    android:
      'Solid surfaces of Material 3 Expressive with their own elevation. No blur, no imitation of glass.',
    why: 'The owner’s decision. Android has no such material; a drawn one would cost battery and look foreign there. The same package falls back to a plain view outside iOS 26, which is this decision in code.',
  },
  {
    what: 'Moving between destinations',
    ios: 'A capsule of glass that floats over the content, at the bottom.',
    android:
      'The navigation bar of Material 3, attached to the bottom edge; the chosen destination in a pill behind its icon.',
    why: 'Each is the bar its system has taught. Which destinations there are is settled with the screens (D-03).',
  },
  {
    what: 'Back',
    ios: 'A round control with a chevron at the top left, and the swipe from the left edge.',
    android:
      'The system’s own back gesture or key, with the previous screen shown under the one that leaves; an arrow at the top left where a screen has a parent.',
    why: 'iOS has no “back” of the system; Android has, and people leave by it. On both, “back” never ends an Outing: leaving one asks first (OUT-13).',
  },
  {
    what: 'Sheets',
    ios: 'Float 8 points off the edges, every corner 38, with a grabber; rest at half and at full height.',
    android:
      'Attached to the bottom edge, the top corners 28, a drag handle 32 by 4; the same two heights.',
    why: 'The shape each system gives its sheets. On both the grabber is a control with a name, and a key opens the sheet in full: nothing is done by dragging alone.',
  },
  {
    what: 'A question that waits',
    ios: 'A pane of glass at the bottom of the screen, the answers one above the other.',
    android: 'A Material dialog in the middle, the answers in words at the end of the row.',
    why: 'Where each system puts a question. On iOS that is also within reach of the thumb that holds the phone.',
  },
  {
    what: 'The system’s own controls',
    ios: 'A switch that slides; segments with a raised thumb; a round, filled field; one of several marked with a tick at the end of its row.',
    android:
      'The Material switch, whose thumb grows and takes a tick; segmented buttons with a tick; the filled field with its line at the foot; a radio button at the start of the row.',
    why: 'A person knows these from every other application on their phone. The product changes their colour and their type, never how they work.',
  },
  {
    what: 'Signs',
    ios: 'Share is an arrow leaving a box; “more” is three dots in a row.',
    android: 'Share is three joined points; “more” is three dots in a column.',
    why: 'The two signs each system uses for the same thing. All other icons are the product’s own and the same on both.',
  },
  {
    what: 'The locked phone',
    ios: 'A Live Activity on the lock screen and in the Dynamic Island: whether one is on time, the next Place, the strip. The system’s “now playing” for the Story.',
    android:
      'A Live Update — an ongoing notification the system keeps at the top — with a bar of progress divided at the stops, and the system’s media controls.',
    why: 'Audio is the main channel and the Outing is completed with the screen locked (NFR-25, OUT-5). These are the system’s surfaces: on iOS the layout of the Live Activity is ours, on Android nothing is a custom view.',
  },
  {
    what: 'The least size of a target',
    ios: '44 points.',
    android: '48 dp.',
    why: 'What each platform asks; both clear the 24 px of WCAG 2.2. A row of a list is 44 high on iOS and 56 on Android.',
  },
  {
    what: 'Corners',
    ios: 'Capsules and concentric corners: a control is as round as its height allows.',
    android: 'The shape scale of Material 3 Expressive: 8, 20, 28.',
    why: 'Shape is the second thing, after material, by which a person knows which system they are in.',
  },
  {
    what: 'The size of text',
    ios: 'Dynamic Type.',
    android: 'The font scale of the system, up to 200 %.',
    why: 'Both are honoured by the same rule: a role that is read grows in full, a large one stops at 130 %, a numeral in a disc does not.',
  },
  {
    what: 'A touch felt',
    ios: 'The system’s “success” haptic on arrival; a light one when a Story begins.',
    android: 'The system’s “confirm” haptic on arrival; a tick when a Story begins.',
    why: 'With the phone in a pocket, arrival is heard and felt before it is seen. Each system has a vocabulary of touches; the product uses two words of it.',
  },
];

/**
 * The accessibility rules, each with what checks it.
 * @param {any} tokens
 */
export const accessibilityRules = (tokens) => [
  {
    rule: 'Contrast',
    text: `Text stands at 4.5 : 1 or more on its ground, large text and graphics at 3 : 1 (WCAG 2.2, 1.4.3 and 1.4.11). In the sun theme text is held to ${tokens.contrast.levels.text.sun} : 1. Text on glass is measured over every area the map can put under a pane.`,
    checked: `Checked by pnpm lint:design — ${tokens.contrast.pairs.length} pairs in each of three themes.`,
  },
  {
    rule: 'Never by colour alone',
    text: 'A verdict is said in words with an icon; a chip that is on gains a tick; an error names what is wrong; a skipped Place is struck out and says “skipped” (1.4.1).',
    checked: 'Checked by review of every specimen: each note names the second carrier.',
  },
  {
    rule: 'Targets',
    text: `Nothing that can be touched is smaller than ${tokens.size.target.ios} points on iOS and ${tokens.size.target.android} dp on Android — both above the 24 px of criterion 2.5.8. Where a shape is drawn smaller, the control around it is the full target.`,
    checked:
      'Checked by pnpm lint:design on the tokens, and on the check page on every control drawn.',
  },
  {
    rule: 'Nothing by dragging alone',
    text: 'A sheet opens by its grabber, which is a button; Places are put in another order by two keys; the Story is moved by “back ten seconds” and “next”; time is set by a stepper (2.5.7).',
    checked: 'Checked by review: each of these controls is a specimen on this page.',
  },
  {
    rule: 'Text that grows',
    text: 'Every role that is read grows to 200 %; a role that is already large stops at 130 %. Controls grow in height with their words, and a row never clips its name.',
    checked:
      'Checked on the check page at 130 % and at 200 %: no line is cut and nothing leaves its screen.',
  },
  {
    rule: 'A name for everything',
    text: 'Every control has a name a screen reader can say, in Russian and in English; an icon that stands alone brings its own. The map, the strip and the bars of the voice have a text alternative. The text of a Story is always on the screen for those who cannot hear it (NFR-27).',
    checked:
      'Checked by pnpm lint:design on the icons, and on the check page on every control drawn.',
  },
  {
    rule: 'One hand, on the move',
    text: `What is used while walking — the prominent action, the keys of the player, an answer — lies in the lower ${Math.round(tokens.size.reach.value * 100)} % of the screen. The top is for what is glanced at.`,
    checked: 'Checked on the check page on every whole screen.',
  },
  {
    rule: 'Bright sunlight',
    text: 'A third theme: every pane solid with a definite edge, text at 7 : 1, heavier icons, a wider line with a darker green, streets with an edge. It is one switch in the menu of the Outing, and may come on by itself — which the owner decides after trying it outdoors.',
    checked:
      'Its contrast is checked by pnpm lint:design; how it reads in the sun is the owner’s to try (D-05).',
  },
  {
    rule: 'Less motion, less transparency',
    text: 'With “reduce motion”, movement becomes a short cross-fade and nothing loops. With “reduce transparency”, every pane of glass is a solid surface.',
    checked: 'Both are rules of the style sheets; each motion study shows what remains.',
  },
  {
    rule: 'Focus that is seen',
    text: 'With a keyboard, on the web or attached to a phone, the control in focus carries a ring in the colour of ink, 2.5 points wide and clear of the control (2.4.7).',
    checked: 'Its contrast is checked by pnpm lint:design; the ring is a specimen on this page.',
  },
];

/**
 * A phone with the part a thumb reaches shaded.
 * @param {any} tokens
 */
export function reach(tokens) {
  const share = tokens.size.reach.value;
  const height = 360;
  const top = Math.round(height * (1 - share));
  return `<svg viewBox="0 0 190 ${height + 20}" role="img" aria-label="The lower ${Math.round(share * 100)} % of a phone’s screen is within reach of a thumb">
    <rect x="12" y="10" width="166" height="${height}" rx="30" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="2"/>
    <path d="M12 ${top + 10}h166V${height - 20}a30 30 0 0 1-30 30H42a30 30 0 0 1-30-30Z" fill="var(--ok-tint)"/>
    <path d="M12 ${top + 10}h166" stroke="var(--line)" stroke-width="2" stroke-dasharray="5 5"/>
    <rect x="28" y="${height - 46}" width="134" height="30" rx="15" fill="var(--accent)"/>
    <rect x="52" y="34" width="86" height="22" rx="11" fill="var(--surface)" stroke="var(--ink-3)"/>
    <circle cx="34" cy="45" r="11" fill="var(--surface)" stroke="var(--ink-3)"/>
    <circle cx="156" cy="45" r="11" fill="var(--surface)" stroke="var(--ink-3)"/>
    <g font-family="var(--font-num)" font-size="11" font-weight="700" text-anchor="middle" fill="var(--ink)">
      <text x="95" y="${height - 60}">1</text><text x="95" y="74">2</text><text x="34" y="74">3</text><text x="156" y="74">3</text>
    </g>
  </svg>`;
}
