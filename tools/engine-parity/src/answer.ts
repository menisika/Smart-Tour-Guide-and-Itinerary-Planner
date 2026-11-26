import { candidateId, type PlanningProblem, stopCandidateId } from '@promenade/contracts';
import { planRoute } from '@promenade/planner';
import { travelSeconds, type TravelTimeTable } from '@promenade/routing';
import { verifyRoute } from '@promenade/verifier';

/** One request of the corpus: a planning problem under a name. */
export interface CorpusEntry {
  readonly id: string;
  readonly problem: PlanningProblem;
}

const START = '(start)';
const FINISH = '(finish)';

/** The problem's travel times as the table `routing` looks times up in. */
function travelTable(problem: PlanningProblem): TravelTimeTable {
  const names = [START, FINISH, ...problem.candidates.map(candidateId)];
  const table = new Map<string, Map<string, number>>();

  problem.travel.seconds.forEach((row, from) => {
    const times = new Map<string, number>();
    row.forEach((seconds, to) => {
      const name = names[to];
      if (seconds !== null && name !== undefined) times.set(name, seconds);
    });
    const name = names[from];
    if (name !== undefined) table.set(name, times);
  });

  return table;
}

/**
 * Everything the three packages say about one problem: the planner's answer,
 * what the verifier finds in it, and the time of every leg as `routing` looks
 * it up. This is the value whose bytes must not depend on the engine.
 */
export function answerProblem(entry: CorpusEntry): unknown {
  const { problem } = entry;
  const answer = planRoute(problem);

  if (answer.outcome !== 'route') return { id: entry.id, answer, violations: [], legs: [] };

  const table = travelTable(problem);
  const points = [START, ...answer.route.stops.map(stopCandidateId), FINISH];
  const legs = points.slice(1).map((to, index) => travelSeconds(table, points[index] ?? START, to));

  return { id: entry.id, answer, violations: verifyRoute(problem, answer.route), legs };
}
