/**
 * The key screens of the Party and of the Catalog, for the registry, and the
 * scenarios SC-2 and SC-7 as walks through their main steps.
 */
import { later } from './screens.js';

const PHONE = ['ios', 'android'];
const EVERYWHERE = ['ios', 'android', 'web', 'webphone'];

const USUAL = 'Usual';
const NO_NETWORK = 'No network';

/** Why a screen is not drawn in a state: the reasons that repeat. */
const WHY = {
  later:
    'The key screens show where the product goes; every state of every screen comes with the full set of the stage.',
};

/** @type {import('../registry.js').Screen[]} */
export const laterScreens = [
  // ── Stage S2 · The Party ────────────────────────────────────────────────
  {
    id: 'party-create',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'Creating an Outing with an Invitation',
    reqs: ['PTY-2', 'PTY-1', 'PTY-6', 'PTY-12', 'ENT-5'],
    note: 'The Organizer sets the day and the time first, because opening hours depend on them (§4.8, rules), then the length, the Meeting Point, the mode and the Travel Mode, and receives a link. The Invitation is said not to be the link to a Route (§4.9, rules). The Party is the sample Party of SC-2.',
    on: PHONE,
    states: { usual: USUAL, link: 'The Invitation is ready' },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.create,
  },
  {
    id: 'party-answer',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'The Invitation answered in the application',
    reqs: ['PTY-4', 'PTY-3', 'PRF-5'],
    note: 'A person with a Profile sees it filled in and changes it for this Outing only. In a browser the same Invitation is the page of `D-04`, answered without an account.',
    on: PHONE,
    states: { usual: USUAL },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.answer,
  },
  {
    id: 'party-options',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'The options, with what is in each for whom',
    reqs: ['PTY-7', 'PTY-8', 'PTY-9', 'PTY-11', 'RTE-16'],
    note: 'One line per option and a tag per member; no chart, no matrix. The line never promises that a Route suits everyone: it says that no Dealbreaker is broken, what each member gets, and who gets least. The Routes are those offered in `D-03`; the lines are samples written from what those Routes really hold.',
    on: EVERYWHERE,
    states: { usual: USUAL, late: 'An answer came after the options were offered' },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.optionsScreen,
  },
  {
    id: 'party-vote',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'Voting, and the Organizer’s choice',
    reqs: ['PTY-10', 'PTY-8', 'NTF-2'],
    note: 'Each option is marked “for” or “against”, by keys with words and a count; the Organizer makes the final choice. The votes are samples.',
    on: EVERYWHERE,
    states: {
      usual: 'Usual: a Participant votes',
      organizer: 'The Organizer chooses',
      chosen: 'An option is chosen',
    },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.vote,
  },
  {
    id: 'party-chat',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'The Chat',
    reqs: ['PTY-13', 'OUT-15', 'OUT-16', 'FBK-4', 'NFR-13'],
    note: 'Text, reactions and what the system says — “Olya answered”, “option 1 chosen”. No files, no voice. Guest Participants use it on the web. Without a network it stays in its place, says why it cannot be used, and a message written then waits in the journal. The messages are samples.',
    on: EVERYWHERE,
    states: { usual: USUAL, offline: NO_NETWORK },
    absent: { loading: WHY.later, empty: WHY.later, error: WHY.later },
    render: later.chatScreen,
  },
  {
    id: 'party-meeting',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'The Meeting Point, and who is on the way',
    reqs: ['PTY-14', 'PTY-15', 'OUT-15', 'NFR-14'],
    note: 'Each member’s status is a word. Sharing a position is off until a member turns it on, lasts only until the Outing starts and is stored nowhere; the one who shares is drawn on the map — here on a real street of the reference Outing. Without a network the positions are shown as unavailable.',
    on: PHONE,
    states: { usual: USUAL, offline: NO_NETWORK },
    absent: { loading: WHY.later, empty: WHY.later, error: WHY.later },
    render: later.meeting,
  },
  {
    id: 'party-outing',
    pkg: 'D-09',
    group: 'Stage S2 · The Party',
    title: 'The shared Outing: Visits ticking off',
    reqs: ['PTY-16', 'I18N-4', 'OUT-20'],
    note: 'Visits are visible to all; each member listens on their own device in their own language (SC-3). Who has been where is a sample.',
    on: PHONE,
    states: { usual: USUAL },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.sharedOuting,
  },

  // ── Stage S3 · The Catalog ──────────────────────────────────────────────
  {
    id: 'catalog',
    pkg: 'D-09',
    group: 'Stage S3 · The Catalog',
    title: 'The Catalog with its filters',
    reqs: ['CAT-2', 'CAT-3', 'CAT-6', 'CAT-10'],
    note: 'Filters by duration, themes, district and Travel Mode. A Route is shown by its own line on the map, never as a card with a stock picture. The three Routes are those offered in `D-03`; their titles, Authors, ratings and numbers of Outings are samples. Where the Catalog stands among the destinations of the application is settled in `D-07`.',
    on: EVERYWHERE,
    states: { usual: USUAL, loading: 'Loading', empty: 'Empty', offline: NO_NETWORK },
    absent: { error: WHY.later },
    render: later.catalog,
  },
  {
    id: 'catalog-route',
    pkg: 'D-09',
    group: 'Stage S3 · The Catalog',
    title: 'A published Route with its Reviews',
    reqs: ['CAT-6', 'CAT-7', 'CAT-1', 'CAT-9', 'FBK-4'],
    note: 'Its rating, the number of Outings, its Reviews; take a copy or start an Outing on it. A Review is written only by someone who completed the Route, and the page says so. A Complaint is offered where it belongs — on a Review — and is said not to hide anything by itself. The Reviews are samples and say nothing about history.',
    on: EVERYWHERE,
    states: { usual: USUAL, complaint: 'A Complaint about a Review', offline: NO_NETWORK },
    absent: { loading: WHY.later, empty: WHY.later, error: WHY.later },
    render: later.published,
  },
  {
    id: 'recap',
    pkg: 'D-09',
    group: 'Stage S3 · The Catalog',
    title: 'The Recap',
    reqs: ['OUT-21', 'CAT-4'],
    note: 'One card made to be saved or posted: the walked line, what was asked for, the time, the distance, the Places. No award, no streak (§1.4). From here a Route can be published; publishing itself is drawn in `D-07`.',
    on: PHONE,
    states: { usual: USUAL },
    absent: { loading: WHY.later, empty: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.recapScreen,
  },
  {
    id: 'visits',
    pkg: 'D-09',
    group: 'Stage S3 · The Catalog',
    title: 'The personal map of Visits',
    reqs: ['ACC-10', 'OUT-8', 'NFR-14'],
    note: 'Cities, Places, Outings. It is made of Visits — the fact that a Place was visited — never of a track of movement. The one Outing is the reference Outing.',
    on: PHONE,
    states: { usual: USUAL, empty: 'Empty' },
    absent: { loading: WHY.later, offline: WHY.later, error: WHY.later },
    render: later.visits,
  },
];

/** @type {{ id: string, title: string, steps: [string, string, string, string?][] }[]} */
export const laterScenarios = [
  {
    id: 'SC-2',
    title: 'Saturday with friends (its main steps)',
    steps: [
      ['party-create', 'usual', 'Dima creates an Outing for Saturday at 14:00, about three hours.'],
      ['party-create', 'link', 'He receives the Invitation link.'],
      ['preview-invitation', 'usual', 'He drops it into the messenger group.'],
      [
        'web-invitation',
        'usual',
        'Each friend opens it in the browser and answers within a minute.',
        'webphone',
      ],
      ['web-invitation', 'answered', 'Olya’s Dealbreaker is “no bars”.', 'webphone'],
      ['party-answer', 'usual', 'A friend with the application answers there.'],
      ['party-options', 'usual', 'Three Routes, a line each; nobody’s Dealbreaker is broken.'],
      ['party-vote', 'usual', 'The friends vote.'],
      ['party-chat', 'usual', 'They talk it over in the Chat.'],
      ['party-vote', 'organizer', 'Dima confirms.'],
      ['party-vote', 'chosen', 'Everyone sees the choice.'],
      ['party-meeting', 'usual', 'On Saturday everyone sees the Meeting Point.'],
      ['party-outing', 'usual', 'Visited Places tick off on everyone’s phone.'],
    ],
  },
  {
    id: 'SC-7',
    title: 'Publishing a Route (its main steps)',
    steps: [
      ['recap', 'usual', 'Olya liked the Route: its Recap, and the way to publish it.'],
      ['catalog', 'usual', 'Other people find it in the Catalog.'],
      [
        'catalog-route',
        'usual',
        'They take it or start an Outing on it, rate it and write Reviews.',
      ],
      ['catalog-route', 'complaint', 'Someone files a Complaint about a Review.'],
      ['visits', 'usual', 'Each Outing marks its Places on a personal map.'],
    ],
  },
];
