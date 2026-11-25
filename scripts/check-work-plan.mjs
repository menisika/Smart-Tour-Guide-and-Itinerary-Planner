#!/usr/bin/env node
// @ts-check
/**
 * Keeps docs/WORK-PLAN.md honest.
 *
 *     node scripts/check-work-plan.mjs           check (part of `pnpm lint`)
 *     node scripts/check-work-plan.mjs --write   also regenerate the maps, the board and the owner's list
 *
 * A work package is the single source of truth for its status, its
 * dependencies and its requirements. Everything else in the plan that shows
 * them — the maps, the status board, the list of owner-only actions — is
 * generated here from the packages, between `<!-- generated:… -->` markers.
 *
 * It fails when:
 *  - a requirement of the specification has no package in its stage;
 *  - a package names a requirement or a dependency that does not exist;
 *  - dependencies form a cycle, or a `done` package rests on one that is not done;
 *  - work is under way outside the design track before the design is approved;
 *  - a stage is closed while one of its packages is still open;
 *  - a package lacks a field, or a generated block is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const specPath = fileURLToPath(new URL('../docs/PRODUCT-SPEC.md', import.meta.url));
const planPath = fileURLToPath(new URL('../docs/WORK-PLAN.md', import.meta.url));
const writeMode = process.argv.includes('--write');

/**
 * `dropped` is for a package that a check or the owner made unnecessary; whoever
 * depended on it is no longer held back by it.
 */
const STATUSES = ['todo', 'in progress', 'blocked', 'done', 'dropped'];
/** @param {string} status */
const settled = (status) => status === 'done' || status === 'dropped';
const TRACK_ID = '(?:[FDC]|S[1-5](?:-[A-Z]+)?)';

/**
 * Stage zero, by the owner's decision: nothing is built before the owner has
 * approved the design. Until this package is done, only the design track and
 * the two packages that set the repository up may be under way.
 */
const DESIGN_GATE = 'D-05';
const BEFORE_THE_GATE = new Set(['F-01', 'F-02']);
const PACKAGE_HEADING = new RegExp(`^### (${TRACK_ID}-\\d{2}) · (.+)$`);
const TRACK_HEADING = new RegExp(`^## (${TRACK_ID}) — (.+)$`);

/** @type {string[]} */
const problems = [];

// ── The specification: which requirements exist, and in which stages ────────

/**
 * @typedef {{ id: string, stages: string[], functional: boolean }} Requirement
 * @returns {Requirement[]}
 */
function readRequirements() {
  /** @type {Requirement[]} */
  const requirements = [];
  let section = 0;

  for (const line of readFileSync(specPath, 'utf8').split('\n')) {
    const heading = /^## (\d+)\./.exec(line);
    if (heading) {
      section = Number(heading[1]);
      continue;
    }
    // Section 4 holds the functional requirements with a stage column,
    // section 5 the non-functional ones with a threshold column.
    if (section !== 4 && section !== 5) continue;
    if (!/^\|\s*\**[A-Z0-9]+-\d+\**\s*\|/.test(line)) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const id = (cells[0] ?? '').replaceAll('*', '');
    const lastCell = cells.at(-1) ?? '';
    const stages = section === 4 ? [...new Set(lastCell.match(/S[1-5]/g) ?? [])] : [];

    requirements.push({ id, stages, functional: section === 4 });
  }
  return requirements;
}

// ── The plan: tracks and work packages ──────────────────────────────────────

/**
 * @typedef {object} WorkPackage
 * @property {string} id
 * @property {string} title
 * @property {string} track
 * @property {string} stage      S0 for the design, S1…S5; foundation and checks serve S1
 * @property {string} status
 * @property {string[]} dependsOn
 * @property {string[]} requirements
 * @property {string | null} ownerOnly
 */

const planText = readFileSync(planPath, 'utf8');
const planLines = planText.split('\n');

/** @type {{ id: string, name: string }[]} */
const tracks = [];
/** @type {WorkPackage[]} */
const packages = [];

/** @param {string} line @param {string} field */
function fieldValue(line, field) {
  const prefix = `- **${field}:**`;
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : null;
}

/** @param {string} value */
function listOfIds(value) {
  return value === '—' || value === '-' || value === ''
    ? []
    : value
        .split(',')
        .map((item) => item.trim().replaceAll('`', ''))
        .filter(Boolean);
}

for (let index = 0; index < planLines.length; index += 1) {
  const line = planLines[index] ?? '';

  const trackHeading = TRACK_HEADING.exec(line);
  if (trackHeading) {
    tracks.push({ id: trackHeading[1] ?? '', name: (trackHeading[2] ?? '').trim() });
    continue;
  }

  const heading = PACKAGE_HEADING.exec(line);
  if (!heading) {
    if (line.startsWith('### ') && /^### \S+-\d+/.test(line)) {
      problems.push(`Line ${index + 1}: "${line}" looks like a work package with a malformed ID.`);
    }
    continue;
  }

  const id = heading[1] ?? '';
  const track = id.replace(/-\d{2}$/, '');
  /** @type {WorkPackage} */
  const workPackage = {
    id,
    title: (heading[2] ?? '').trim(),
    track,
    stage: /^S[1-5]/.test(track) ? track.slice(0, 2) : track === 'D' ? 'S0' : 'S1',
    status: '',
    dependsOn: [],
    requirements: [],
    ownerOnly: null,
  };

  let hasGoal = false;
  let hasDoneWhen = false;
  let hasTask = false;
  let hasDecisions = false;

  for (let inner = index + 1; inner < planLines.length; inner += 1) {
    const body = planLines[inner] ?? '';
    if (body.startsWith('### ') || body.startsWith('## ')) break;

    const status = fieldValue(body, 'Status');
    if (status !== null) workPackage.status = status;

    const dependsOn = fieldValue(body, 'Depends on');
    if (dependsOn !== null) workPackage.dependsOn = listOfIds(dependsOn);

    const requirements = fieldValue(body, 'Requirements');
    if (requirements !== null) {
      workPackage.requirements = requirements.match(/[A-Z0-9]+-\d+/g) ?? [];
    }

    if (fieldValue(body, 'Decisions') !== null) hasDecisions = true;
    if (fieldValue(body, 'Needs from other tracks') !== null) {
      problems.push(`${id}: "Needs from other tracks" must be resolved into "Depends on".`);
    }

    if (body.startsWith('**Goal.**')) hasGoal = true;
    if (body.startsWith('**Done when**')) hasDoneWhen = true;
    if (/^- \[[ x]\] /.test(body)) hasTask = true;
    if (body.startsWith('**Owner only.**')) {
      workPackage.ownerOnly = body.slice('**Owner only.**'.length).trim();
    }
  }

  if (!STATUSES.includes(workPackage.status)) {
    problems.push(`${id}: status "${workPackage.status}" is not one of ${STATUSES.join(', ')}.`);
  }
  if (!hasGoal) problems.push(`${id}: no "**Goal.**" line.`);
  if (!hasDoneWhen) problems.push(`${id}: no "**Done when**" list.`);
  if (!hasDecisions) problems.push(`${id}: no "Decisions" field.`);
  // Stages S4 and S5 are planned as large blocks; their task lists come later.
  if (!hasTask && !['S4', 'S5'].includes(workPackage.stage)) {
    problems.push(`${id}: no task ("- [ ] …").`);
  }

  packages.push(workPackage);
}

const byId = new Map(packages.map((workPackage) => [workPackage.id, workPackage]));
if (byId.size !== packages.length) {
  const seen = new Set();
  for (const { id } of packages) {
    if (seen.has(id)) problems.push(`${id}: the ID is used by more than one package.`);
    seen.add(id);
  }
}

const trackIds = new Set(tracks.map((track) => track.id));
for (const workPackage of packages) {
  if (!trackIds.has(workPackage.track)) {
    problems.push(`${workPackage.id}: no "## ${workPackage.track} — …" heading for its track.`);
  }
}

// ── Dependencies: they exist, they do not loop, and "done" rests on "done" ───

for (const workPackage of packages) {
  for (const dependency of workPackage.dependsOn) {
    const target = byId.get(dependency);
    if (!target) {
      problems.push(`${workPackage.id}: depends on ${dependency}, which does not exist.`);
    } else if (workPackage.status === 'done' && !settled(target.status)) {
      problems.push(`${workPackage.id} is done but depends on ${dependency}, which is not.`);
    }
  }
}

const designGate = byId.get(DESIGN_GATE);
if (!designGate) {
  problems.push(`The design gate ${DESIGN_GATE} is missing from the plan.`);
} else if (designGate.status !== 'done') {
  for (const workPackage of packages) {
    const started = workPackage.status === 'in progress' || workPackage.status === 'done';
    if (started && workPackage.track !== 'D' && !BEFORE_THE_GATE.has(workPackage.id)) {
      problems.push(
        `${workPackage.id} is ${workPackage.status}, but the design is not approved yet: ` +
          `${DESIGN_GATE} must be done before anything outside track D starts.`,
      );
    }
  }
}

// A stage is closed by one package, and only when every other package of the
// stage is done or dropped.
for (const closing of packages) {
  const stage = /^Closing stage (S[1-5])$/.exec(closing.title)?.[1];
  if (!stage || closing.status !== 'done') continue;
  for (const workPackage of packages) {
    if (workPackage.stage === stage && workPackage !== closing && !settled(workPackage.status)) {
      problems.push(
        `${closing.id} closes stage ${stage}, but ${workPackage.id} is ${workPackage.status}.`,
      );
    }
  }
}

/** @type {Map<string, 'visiting' | 'visited'>} */
const visitState = new Map();
/** @param {string} id @param {string[]} path */
function visit(id, path) {
  const state = visitState.get(id);
  if (state === 'visited') return;
  if (state === 'visiting') {
    problems.push(`Dependency cycle: ${[...path.slice(path.indexOf(id)), id].join(' → ')}.`);
    return;
  }
  visitState.set(id, 'visiting');
  for (const dependency of byId.get(id)?.dependsOn ?? []) {
    if (byId.has(dependency)) visit(dependency, [...path, id]);
  }
  visitState.set(id, 'visited');
}
for (const { id } of packages) visit(id, []);

// ── Coverage: every requirement has a package in each of its stages ─────────

const requirements = readRequirements();
const knownRequirements = new Set(requirements.map((requirement) => requirement.id));

for (const workPackage of packages) {
  for (const requirement of workPackage.requirements) {
    if (!knownRequirements.has(requirement)) {
      problems.push(`${workPackage.id}: ${requirement} is not a requirement of the specification.`);
    }
  }
}

for (const requirement of requirements) {
  const holders = packages.filter((workPackage) =>
    workPackage.requirements.includes(requirement.id),
  );

  if (!requirement.functional) {
    if (holders.length === 0) problems.push(`${requirement.id}: no work package covers it.`);
    continue;
  }
  for (const stage of requirement.stages) {
    if (!holders.some((workPackage) => workPackage.stage === stage)) {
      problems.push(`${requirement.id}: no work package of stage ${stage} covers it.`);
    }
  }
}

// ── Generated blocks ────────────────────────────────────────────────────────

const STATUS_CLASS = {
  todo: 'todo',
  'in progress': 'progress',
  blocked: 'blocked',
  done: 'done',
  dropped: 'outside',
};
const CLASS_DEFINITIONS = [
  '  classDef done fill:#d3f9d8,stroke:#2b8a3e,color:#000',
  '  classDef progress fill:#fff3bf,stroke:#e67700,color:#000',
  '  classDef blocked fill:#ffe3e3,stroke:#c92a2a,color:#000',
  '  classDef todo fill:#f1f3f5,stroke:#868e96,color:#000',
  '  classDef outside fill:#ffffff,stroke:#868e96,stroke-dasharray:4 3,color:#000',
];

/** @param {string} id */
const nodeId = (id) => id.replaceAll('-', '_');
/** @param {string} text */
const label = (text) => text.replaceAll('"', '#quot;');
/** @param {WorkPackage} workPackage */
const statusClass = (workPackage) =>
  STATUS_CLASS[/** @type {keyof typeof STATUS_CLASS} */ (workPackage.status)] ?? 'todo';

/**
 * The whole plan on one screen: stage zero, then the stages in order. The
 * tracks of stage S1 depend on each other in both directions, package by
 * package, so they are shown side by side here and in detail on their own maps.
 */
function overviewMap() {
  /** @param {{ id: string, name: string }} track */
  const trackNode = (track) => {
    const own = packages.filter((workPackage) => workPackage.track === track.id);
    const done = own.filter((workPackage) => settled(workPackage.status)).length;
    const state =
      own.length > 0 && done === own.length
        ? 'done'
        : own.some((workPackage) => workPackage.status !== 'todo')
          ? 'progress'
          : 'todo';
    return `${nodeId(track.id)}["<b>${track.id}</b> · ${label(track.name)}<br/>${done} of ${own.length} done"]:::${state}`;
  };
  /** @param {(id: string) => boolean} belongs */
  const nodes = (belongs) =>
    tracks.filter((track) => belongs(track.id)).map((track) => `    ${trackNode(track)}`);

  const stageOne = (/** @type {string} */ id) => id === 'F' || id === 'C' || id.startsWith('S1');
  const later = tracks.filter((track) => /^S[2-5]$/.test(track.id));

  return [
    '```mermaid',
    'flowchart LR',
    ...CLASS_DEFINITIONS,
    '  subgraph ZERO["Stage zero — the design, approved by the owner"]',
    ...nodes((id) => id === 'D'),
    '  end',
    '  subgraph ONE["Stage S1 — a solo Outing on foot"]',
    '    direction TB',
    ...nodes(stageOne),
    '  end',
    ...later.map((track) => `  ${trackNode(track)}`),
    `  ZERO ==> ONE${later.map((track) => ` ==> ${nodeId(track.id)}`).join('')}`,
    '```',
  ].join('\n');
}

/** @param {string} trackId */
function trackMap(trackId) {
  const own = packages.filter((workPackage) => workPackage.track === trackId);
  const lines = ['```mermaid', 'flowchart LR', ...CLASS_DEFINITIONS];
  const outside = new Set();
  const edges = [];

  for (const workPackage of own) {
    lines.push(
      `  ${nodeId(workPackage.id)}["<b>${workPackage.id}</b><br/>${label(workPackage.title)}"]:::${statusClass(workPackage)}`,
    );
    for (const dependency of workPackage.dependsOn) {
      const target = byId.get(dependency);
      if (!target) continue;
      if (target.track !== trackId) outside.add(dependency);
      edges.push(`  ${nodeId(dependency)} --> ${nodeId(workPackage.id)}`);
    }
  }
  for (const id of [...outside].sort()) {
    lines.push(`  ${nodeId(id)}(["${id}"]):::outside`);
  }
  return [...lines, ...edges, '```'].join('\n');
}

function statusBoard() {
  const rows = ['| Package | Title | Status | Depends on |', '|---|---|---|---|'];
  for (const workPackage of packages) {
    const status = workPackage.status === 'todo' ? 'todo' : `**${workPackage.status}**`;
    rows.push(
      `| ${workPackage.id} | ${workPackage.title} | ${status} | ${workPackage.dependsOn.join(', ') || '—'} |`,
    );
  }

  const counts = STATUSES.map(
    (status) =>
      `${packages.filter((workPackage) => workPackage.status === status).length} ${status}`,
  ).join(' · ');
  return `${packages.length} work packages: ${counts}.\n\n${rows.join('\n')}`;
}

function ownerList() {
  const items = packages
    .filter((workPackage) => workPackage.ownerOnly)
    .map((workPackage) => `- **${workPackage.id}** — ${workPackage.ownerOnly}`);
  return items.length > 0 ? items.join('\n') : 'Nothing yet.';
}

/** @param {string} name */
function generate(name) {
  if (name === 'map') return overviewMap();
  if (name === 'board') return statusBoard();
  if (name === 'owner') return ownerList();
  if (name.startsWith('track ')) return trackMap(name.slice('track '.length));
  problems.push(`Unknown generated block "${name}".`);
  return '';
}

let generatedBlocks = 0;
const regenerated = planText.replace(
  /<!-- generated:([^>]+?) -->\n[\s\S]*?<!-- \/generated -->/g,
  (_match, name) => {
    generatedBlocks += 1;
    return [
      `<!-- generated:${name} -->`,
      '<!-- prettier-ignore-start -->',
      generate(String(name).trim()),
      '<!-- prettier-ignore-end -->',
      '<!-- /generated -->',
    ].join('\n');
  },
);

for (const track of tracks) {
  if (!planText.includes(`<!-- generated:track ${track.id} -->`)) {
    problems.push(`Track ${track.id} has no "<!-- generated:track ${track.id} -->" block.`);
  }
}
for (const required of ['map', 'board', 'owner']) {
  if (!planText.includes(`<!-- generated:${required} -->`)) {
    problems.push(`The plan has no "<!-- generated:${required} -->" block.`);
  }
}

if (regenerated !== planText) {
  if (writeMode) {
    writeFileSync(planPath, regenerated);
    console.log(`Regenerated ${generatedBlocks} blocks of docs/WORK-PLAN.md.`);
  } else {
    problems.push(
      'The maps, the status board or the owner\'s list are out of date. Run "pnpm plan:update".',
    );
  }
}

// ── Verdict ─────────────────────────────────────────────────────────────────

if (problems.length > 0) {
  console.error(`docs/WORK-PLAN.md has ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const functional = requirements.filter((requirement) => requirement.functional).length;
console.log(
  `Work plan: ${packages.length} packages in ${tracks.length} tracks cover ` +
    `${functional} functional and ${requirements.length - functional} non-functional requirements.`,
);
