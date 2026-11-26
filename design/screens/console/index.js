/**
 * The screens of the internal console, for the registry.
 *
 * One desktop-first application of its own (ADR-0007, point 4), drawn at
 * 1440 × 900. What is real on these screens is copied from the research
 * spike into `design/data/console.json`, block by block with its source;
 * what the product has to exist for — a run of Preparation, a rating, an
 * audit entry — is a marked sample there, and each screen says which.
 */
import { oversight } from './admin.js';
import { knowledge } from './knowledge.js';
import { more } from './more.js';
import { places } from './places.js';

const ON = ['console'];
const PKG = 'D-04';
const GROUP = 'The console';

/** Why a screen of the console is not drawn in a state: the reasons that repeat. */
const WHY = {
  offline:
    'The console is a web application at a desk: without a network the browser says so itself (§6).',
  loading:
    'Drawn once, for the verification queue and the dashboards: every table of the console loads the same way.',
  error:
    'A failure of the console itself has no requirement of its own; failures of what it oversees are states of their screens.',
};

/** @type {import('../registry.js').Screen[]} */
export const consoleScreens = [
  {
    id: 'console-queue',
    pkg: PKG,
    group: GROUP,
    title: 'The verification queue of Dossiers',
    reqs: ['CUR-1', 'KNW-14', 'KNW-15', 'PLC-10', 'ACC-9'],
    note: 'Ordered by expected popularity, sensitivity and open Corrections, with the reasons of the first row said in words beside it. Real: the Places, their monthly page views, the languages of their articles, the heritage list, and the sensitivity marks. A Place outside the sample of page views shows “no data”. Samples: which Dossier is a draft or stale, the open Correction, the count of Key Places verified.',
    on: ON,
    states: {
      usual: 'Usual',
      verified: 'After a Dossier is verified',
      loading: 'Loading',
      empty: 'Empty: every Dossier is verified',
    },
    absent: { offline: WHY.offline, error: WHY.error },
    render: knowledge.queue,
  },
  {
    id: 'console-dossier',
    pkg: PKG,
    group: GROUP,
    title: 'The Dossier editor',
    reqs: [
      'CUR-2',
      'KNW-4',
      'KNW-5',
      'KNW-6',
      'KNW-8',
      'KNW-9',
      'KNW-13',
      'KNW-14',
      'KNW-15',
      'KNW-16',
      'FBK-3',
    ],
    note: 'Facts with their sources at the left; the Story as it will be heard, each sentence with the facts it rests on, its Narration and what has to hold before verifying at the right. A fact is one sentence of the cited passage of the mockups with the article revision cited there: no fact is written for a mockup, and the text of a “fixed” fact is left as it is. Samples: the theme tags, which fact is doubtful, the counts of checked statements, the length of the Narration. “No Story” is a real Place, a memorial of the war nested in a Territory; that its Dossier has no confirmed fact is a sample of the state. The state “scores” adds the scores of the themes, which a Curator adjusts, the names with where each came from, and the note of a contradiction: the two cited passages do differ on the fact shown, and no fact is written for it. The scores are samples; both names of this Place come from sources, so no proposed name stands here: a proposed name is edited in the Place editor’s state “access”.',
    on: ON,
    states: {
      usual: 'Usual: a draft of a sensitive Place',
      removed: 'A doubtful fact removed; the Narration is listened to',
      verified: 'Verified',
      corrected: 'A fact opened from a Correction',
      fixed: 'The fact fixed: Story and Narration regenerated',
      nostory: 'Empty: a sensitive Place without a Story',
      scores: 'Theme scores, names, and a contradiction between two sources',
    },
    absent: { loading: WHY.loading, offline: WHY.offline, error: WHY.error },
    render: knowledge.dossier,
  },
  {
    id: 'console-pronunciation',
    pkg: PKG,
    group: GROUP,
    title: 'The pronunciation editor',
    reqs: ['CUR-3', 'KNW-12', 'KNW-13'],
    note: 'The dictionary at the left; a word on a board of letters at the right: each vowel is a key, the stressed one carries the stroke. Real: the phrases and the stress shown in the lead of the Russian Wikipedia article. Samples: the status of each entry, the wrong guess of the voice, what was transcribed back, the count of Narrations a word is used in. No Narration exists yet, so nothing can be heard. The state “override” fixes the reading of an ordinary word inside one Story (ADR-0014, point 2): the word is real, from the cited Russian passage; that the voice misread it is a sample. A preview counts against the synthesis budget and says so.',
    on: ON,
    states: {
      usual: 'Usual: a stress that differs from the source',
      fixed: 'The stress corrected: Narrations regenerated',
      unknown: 'A name whose stress no source shows',
      override: 'An ordinary word fixed in one Story',
    },
    absent: {
      loading: WHY.loading,
      empty: 'The dictionary starts from the names of the Places and is never empty.',
      offline: WHY.offline,
      error: WHY.error,
    },
    render: knowledge.pronunciation,
  },
  {
    id: 'console-place',
    pkg: PKG,
    group: GROUP,
    title: 'The Place editor with its map',
    reqs: ['CUR-5', 'PLC-1', 'PLC-2', 'PLC-3', 'PLC-4', 'PLC-5', 'PLC-9', 'PLC-11', 'OUT-3'],
    note: 'A Territory on the map with its boundary, its Entrances, the Places nested in it and the circle in which a Story starts; beside it every attribute with where it came from and when it was checked. Real: the boundary, the six Entrances, the three nested Places and the tags, as OpenStreetMap has them; the pair to merge is two objects with one name and one Wikidata item. Samples: the trigger radius, who set it, the hiding. Opening hours are unknown in the sources and are shown as unknown. Added from the audit of the work plan: parking points for a car and a bicycle (real objects of the map; that they are the chosen ones is a sample); the state “access” — a real nested Place with opening hours, its names with their marks (the generated English name and the transliteration are samples) and the intervals its hours resolve to for two weeks, beside the raw value; the state “split” — two real objects that share one Wikidata item, held as one Place in the sample.',
    on: ON,
    states: {
      usual: 'Usual',
      access: 'Access Rules of a nested Place: resolved intervals, names with their marks',
      merge: 'Merging two records of one Place',
      split: 'Splitting a Place that is two',
      hidden: 'Hidden',
    },
    absent: {
      loading: WHY.loading,
      empty: 'The editor is opened on a Place.',
      offline: WHY.offline,
      error: WHY.error,
    },
    render: places.place,
  },
  {
    id: 'console-changes',
    pkg: PKG,
    group: GROUP,
    title: 'Proposed Changes, and the history of a Place',
    reqs: ['CUR-12', 'PLC-12', 'PLC-13', 'PLC-7'],
    note: 'The queue grouped by what waits for a Curator and what was applied without a person; a change as old → new with its evidence; the history of the Place with undo. Real: the Places, the old and the new value and the day, read from two extracts of OpenStreetMap; the counts of thirty days. Samples: that a Curator had set the hours of two Venues, and who accepted a change and when. Added from the audit: filters by area, origin and kind and the order by Key Place; the changes of one low-risk sort accepted as a group; a held run with release and discard (a sample; the share of the mass edit of November 2024 is real); and an undo that is refused, with its reason (the later edit is a sample).',
    on: ON,
    states: {
      usual: 'Usual: a closure waits for a Curator',
      history: 'An accepted change, with undo',
      refused: 'An undo that is refused, with its reason',
      held: 'Error: a run held by its limit; release or discard',
      empty: 'Empty: nothing waits',
    },
    absent: { loading: WHY.loading, offline: WHY.offline, error: WHY.error },
    render: places.changes,
  },
  {
    id: 'console-corrections',
    pkg: PKG,
    group: GROUP,
    title: 'The Corrections inbox',
    reqs: ['CUR-7', 'FBK-3', 'KNW-16', 'NTF-1'],
    note: 'The statement, its source and the claim, and what follows from fixing the fact: Story, Narration, the answer to the author. The statement is a sentence of the cited passage; the claim is shown as the kind chosen, and its note is empty: no historical claim is written for a mockup. The author is shown as a User or a Guest, never by name. The Corrections are samples. “Accept without change” stands beside “Decline” and “Open the fact”.',
    on: ON,
    states: {
      usual: 'Usual: a new Correction',
      fixed: 'Fixed: the author is told',
      empty: 'Empty: no Corrections',
    },
    absent: { loading: WHY.loading, offline: WHY.offline, error: WHY.error },
    render: knowledge.corrections,
  },
  {
    id: 'console-preparation',
    pkg: PKG,
    group: GROUP,
    title: 'Preparation: start, progress, failures, cost',
    reqs: ['CUR-4', 'KNW-1', 'KNW-2', 'KNW-3', 'KNW-19', 'NFR-22'],
    note: 'A run is started for a city, an area or a list of Places; what is already prepared is not prepared again. The run shows how many Places have passed each step, what failed and why, and what it costs per component against the budget. Real: the area on the map and the number of Places in it. Samples: the run, its progress, its failures and every sum of money. The state “areas” opens and closes an area to a Curator: the counts of Places are real, which area is opened is a sample.',
    on: ON,
    states: {
      start: 'Empty: before the first run',
      usual: 'Usual: a run under way',
      failed: 'Error: finished with failures; resume',
      budget: 'Held: a budget is reached',
      areas: 'Areas opened to a Curator',
    },
    absent: { loading: WHY.loading, offline: WHY.offline },
    render: knowledge.preparation,
  },
  {
    id: 'console-sources',
    pkg: PKG,
    group: GROUP,
    title: 'Sources with doubtful matches, and Freshness Checks',
    reqs: ['CUR-12', 'PLC-7', 'PLC-11', 'PLC-14', 'NFR-19'],
    note: 'Each Source with its licence, last run, records and share matched; the matches the matcher is not sure of, for a Curator to decide; the table of Freshness Checks with how recently Places were confirmed, by kind. Real: every count, date, pair and share, from the research spike; the names of a pair are as the sources have them. Samples: the failed requests and the switch of a Freshness Check. The state “sites” holds the fragments of websites with “enter hours” and “dismiss”, and the Places to check in person with “confirm” and “correct”: the Places, hosts and the hours the base has are real — one of them a value the parser cannot resolve —; the research keeps no text of a page, so the fragment shown is the map’s own value, marked as a sample of a fragment. In “checks” the interval is a control and the runs of a Freshness Check are listed (the first line real, the rest samples).',
    on: ON,
    states: {
      usual: 'Usual: Sources and doubtful matches',
      checks: 'The table of Freshness Checks, with intervals and runs',
      sites: 'Website fragments, and Places to check in person',
    },
    absent: {
      loading: WHY.loading,
      empty: 'The Sources are part of the system and are always listed.',
      offline: WHY.offline,
      error: WHY.error,
    },
    render: places.sources,
  },
  {
    id: 'console-venues',
    pkg: PKG,
    group: GROUP,
    title: 'Venue selection',
    reqs: ['CUR-6', 'PLC-6', 'KNW-18', 'PLC-4'],
    note: 'The Venues near a Place of a Route, on the map and in a table; a Venue enters Routes only by the switch of its row. A selected Venue has a short practical Dossier and one line “why here”, which is left empty: nothing is written about a real Venue for a mockup. Real: the Venues, their kinds, opening hours and check dates; the share of Venues with known hours. Sample: which three are selected.',
    on: ON,
    states: {
      usual: 'Usual',
      none: 'Empty: no Venue selected, a Break instead',
    },
    absent: { loading: WHY.loading, offline: WHY.offline, error: WHY.error },
    render: places.venues,
  },
  {
    id: 'console-dashboards',
    pkg: PKG,
    group: GROUP,
    title: 'Dashboards',
    reqs: [
      'CUR-8',
      'PLC-10',
      'PLC-14',
      'KNW-19',
      'FBK-6',
      'ANL-2',
      'ANL-4',
      'NFR-22',
      'NFR-28',
      'OUT-3',
    ],
    note: 'Coverage of the city, the cost of Preparation per Place against its budget, ratings, how reliably Stories start by themselves, failures, and Corrections with changes to Places. Real: the shares of known opening hours and the counts of changes. Samples: everything that needs the product to run — verified Dossiers, cost, ratings, trigger reliability, failures. The state “coverage” shows Coverage by city and region with the areas reviewed by nobody, and freshness by area and by kind (object counts and shares of edits are real; Key Places and verified Dossiers are samples). The state “product” shows each measure of ANL-2 by week, activations, ratings of Stories by Place and language and Corrections by status and age: all samples.',
    on: ON,
    states: {
      usual: 'Usual',
      coverage: 'Coverage by city and region; freshness by area and kind',
      product: 'Product measures over time, Story ratings, Corrections by age',
      loading: 'Loading',
      empty: 'Empty: a city nobody prepared',
    },
    absent: { offline: WHY.offline, error: WHY.error },
    render: oversight.dashboards,
  },
  {
    id: 'console-admin',
    pkg: PKG,
    group: GROUP,
    title: 'Administration',
    reqs: [
      'CUR-9',
      'ACC-7',
      'ACC-8',
      'ACC-9',
      'ENT-1',
      'ENT-2',
      'ENT-3',
      'ENT-4',
      'NFR-22',
      'NFR-31',
    ],
    note: 'Roles per person, what each Plan grants as switches of the four capabilities, “open access”, the limits and monthly budgets of Preparation, and the audit log of every action taken with an internal role. Everything on it is a sample: people by first names of the scenarios on a reserved domain, limits, budgets and entries. The state “limits” holds the rate limits an Administrator changes without a release (F-11); the state “audit” is the whole log filtered by person, action, entity and period, with the before and after of an entry.',
    on: ON,
    states: {
      usual: 'Usual',
      over: 'Error: a budget is exceeded',
      limits: 'Rate limits',
      audit: 'The audit log, filtered',
    },
    absent: {
      loading: WHY.loading,
      empty: 'There is always one Administrator and the Plans.',
      offline: WHY.offline,
    },
    render: oversight.admin,
  },
  {
    id: 'console-places',
    pkg: 'D-05',
    group: GROUP,
    title: 'The list of Places, and the list of Key Places',
    reqs: ['CUR-5', 'PLC-1', 'PLC-2', 'PLC-10', 'PLC-14'],
    note: 'What stands behind “Places” in the navigation: a table with a search, filters by kind, area and status, the Key Places and the flagged. A Territory with no known Entrance is flagged and treated as open on all sides (S1-PLC-03). The list of Key Places is seeded from page views and the heritage list and is the Curator’s to change, each change a record (S1-PLC-17). Real: the Places and Territories, their nested Places, tagged Entrances, opening hours, page views, and the 38 Territories of 115 with no tagged Entrance. Samples: which Places are Key Places and how each got on the list. Every Territory of the research has paths crossing its boundary, so “no Entrance” is read here as “no tagged Entrance”.',
    on: ON,
    states: {
      usual: 'Usual',
      keys: 'The list of Key Places',
      flagged: 'Flagged: Territories with no Entrance',
      empty: 'Empty: nothing found',
    },
    absent: { loading: WHY.loading, offline: WHY.offline, error: WHY.error },
    render: more.placesList,
  },
  {
    id: 'console-operations',
    pkg: 'D-05',
    group: GROUP,
    title: 'Operations: what can run out, what ran, what waits',
    reqs: ['NFR-28', 'NFR-30', 'NFR-34', 'NFR-22'],
    note: 'The operations view of S1-OPS-07: usage against each free allowance and each budget of the cost ledger, with the date they reset; the last results of the backup, the restore rehearsal — the first one in the cloud —, the export and the Freshness Checks; the backlog of the outbox and of the journal intake; the three platform alerts and what the system itself raised. Everything on it is a sample: nothing runs in the cloud yet. Only the allowances of instance time and of storage are the estimates of ADR-0024.',
    on: ON,
    states: {
      usual: 'Usual',
      alert: 'Error: an allowance near its end, a failed rehearsal, a backlog',
    },
    absent: {
      loading: WHY.loading,
      empty:
        'Before the first deployment the view shows the stand-in values of the local environment.',
      offline: WHY.offline,
    },
    render: more.operations,
  },
  {
    id: 'console-sign-in',
    pkg: 'D-05',
    group: GROUP,
    title: 'Signing in to the console, and being refused',
    reqs: ['ACC-9', 'ACC-7', 'ACC-8', 'NFR-31'],
    note: 'No shell: the console shows nothing to a person it does not know. A Guest has no account and meets this page; a User who signs in without an internal role is refused in words, and told that the attempt is recorded and who grants a role; a person with another role is refused inside the console, at the section they may not open. Sign-in with Apple and with Google is drawn without their marks. The account refused is the sample person of the phone’s screens.',
    on: ON,
    states: {
      usual: 'Usual: sign-in',
      refused: 'Refused: signed in, no internal role',
      wrongrole: 'Refused: a role, but not the one the section asks for',
    },
    absent: {
      loading: WHY.loading,
      empty: 'It always has its form or its refusal.',
      offline: WHY.offline,
      error: 'The failures of sign-in are drawn for the web and the phone: the same components.',
    },
    render: more.signIn,
  },
  {
    id: 'console-update',
    pkg: 'D-05',
    group: GROUP,
    title: '“Update required”, in the console',
    reqs: ['NFR-29', 'NFR-38', 'ADR-0025'],
    note: 'A tab left open over a release is older than the server accepts (ADR-0025, point 4; F-03). It stands in place of the shell, because nothing the tab does would be accepted: one sentence, the two versions, one action. It says plainly that what is typed and not saved is lost. The version numbers are samples.',
    on: ON,
    states: { usual: 'Usual' },
    absent: {
      loading: 'It is shown at once, from the code of one answer.',
      empty: 'It always has its one message.',
      offline: WHY.offline,
      error: WHY.error,
    },
    render: more.update,
  },
];

/** @type {{ id: string, title: string, steps: import('../registry.js').Step[] }[]} */
export const consoleScenarios = [
  {
    id: 'SC-5',
    title: 'The Curator prepares the city',
    steps: [
      [
        'console-preparation',
        'start',
        'The Curator chooses the centre of the city and starts Preparation.',
        'console',
      ],
      [
        'console-preparation',
        'usual',
        'It runs in the background: progress, failures, cost.',
        'console',
      ],
      [
        'console-queue',
        'usual',
        'Dossiers arrive in a queue ordered by expected popularity and sensitivity.',
        'console',
      ],
      [
        'console-dossier',
        'usual',
        'For a Dossier the Curator sees facts with their sources.',
        'console',
      ],
      ['console-pronunciation', 'usual', 'A stress in a street name is wrong.', 'console'],
      [
        'console-pronunciation',
        'fixed',
        'The Curator fixes it; the Narrations with the word are regenerated.',
        'console',
      ],
      [
        'console-dossier',
        'removed',
        'A doubtful fact is removed, and the Narration is listened to.',
        'console',
      ],
      ['console-dossier', 'verified', 'The Dossier is marked verified.', 'console'],
      [
        'console-queue',
        'verified',
        'A Place about a wartime event is flagged sensitive and stays without a Story until verified.',
        'console',
      ],
    ],
  },
  {
    id: 'SC-6-console',
    title: 'A Correction, at the Curator’s desk',
    steps: [
      [
        'console-corrections',
        'usual',
        'The Curator sees the statement, its source and the claim.',
        'console',
      ],
      ['console-dossier', 'corrected', 'The fact is opened in the Dossier and fixed.', 'console'],
      ['console-dossier', 'fixed', 'The Story and the Narration are regenerated.', 'console'],
      ['console-corrections', 'fixed', 'The listener is told the outcome.', 'console'],
    ],
  },
];
