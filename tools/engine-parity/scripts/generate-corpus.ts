/**
 * Writes the corpus of planning requests. It was generated once, from the
 * seeds below, and is committed: the pipeline never generates it, so a new
 * version of the generator cannot change what the engines are compared on.
 *
 *     node --conditions=@promenade/source tools/engine-parity/scripts/generate-corpus.ts
 *
 * Extend the corpus by adding entries here and running the script again; the
 * existing entries keep their bytes as long as their seeds and the generator
 * stay as they are. Then run the check with `--update-hashes`.
 */
import { writeFileSync } from 'node:fs';

import { type PlanningProblem, planningProblemSchema } from '@promenade/contracts';
import { samplePlanningProblems } from '@promenade/contracts/testing';

import type { CorpusEntry } from '../src/answer.ts';
import { canonicalJson } from '../src/canonical-json.ts';
import { corpusFile } from '../src/engines.ts';

const SOLO_SEED = 20261126;
const PARTY_SEED = 20261127;

const numbered = (prefix: string, problems: readonly PlanningProblem[]): CorpusEntry[] =>
  problems.map((problem, index) => ({
    id: `${prefix}-${String(index + 1).padStart(4, '0')}`,
    problem,
  }));

// One person, as in S1, with enough candidates for an ordering to matter.
const solo = numbered(
  'solo',
  samplePlanningProblems(SOLO_SEED, 120, { maxMembers: 1, maxCandidates: 16 }),
);

// Party-shaped requests: several members with their own Dealbreakers and pace.
const party = numbered(
  'party',
  samplePlanningProblems(PARTY_SEED, 200, { maxMembers: 5, maxCandidates: 16 })
    .filter((problem) => problem.party.members.length > 1)
    .slice(0, 40),
);

// Edge cases, cut from the first solo request that has several candidates.
const base = solo.find((entry) => entry.problem.candidates.length >= 4)?.problem;
if (base === undefined) throw new Error('No solo request has four candidates.');

const noPathToFinish = base.travel.seconds.map((row, from) =>
  row.map((seconds, to) => ((from === 1) !== (to === 1) ? null : seconds)),
);

const edges: CorpusEntry[] = [
  { id: 'edge-zero-budget', problem: { ...base, timeBudgetSeconds: 0 } },
  { id: 'edge-buffer-larger-than-budget', problem: { ...base, bufferSeconds: 36_000 } },
  {
    id: 'edge-no-candidates',
    problem: {
      ...base,
      candidates: [],
      pinnedPlaceIds: [],
      travel: {
        ...base.travel,
        seconds: base.travel.seconds.slice(0, 2).map((row) => row.slice(0, 2)),
      },
    },
  },
  {
    id: 'edge-no-path-to-finish',
    problem: { ...base, travel: { ...base.travel, seconds: noPathToFinish } },
  },
  {
    id: 'edge-every-place-closed',
    problem: {
      ...base,
      pinnedPlaceIds: [],
      candidates: base.candidates.map((candidate) =>
        candidate.type === 'place'
          ? { ...candidate, hours: { confidence: 'known' as const, intervals: [] } }
          : candidate,
      ),
    },
  },
  { id: 'edge-break-required', problem: { ...base, break: { required: true } } },
];

const entries = [...solo, ...party, ...edges];
for (const entry of entries) planningProblemSchema.parse(entry.problem);

writeFileSync(corpusFile, entries.map((entry) => `${canonicalJson(entry)}\n`).join(''));
console.log(`Wrote ${entries.length} requests to ${corpusFile}.`);
