// VIOLATION: a driver whose output depends on the engine.
//
// The comparator below answers with a boolean — "is a after b?" — where a
// number is expected. `true` counts as "after" and `false` as "equal", never as
// "before", so the order of the result is left to each engine's sorting
// algorithm: the server's and the phone's give different orders from about
// eight items on. It is the classic way an ordering becomes engine-dependent
// without a single unusual call.
import { answerProblem, type CorpusEntry } from '../../../engine-parity/src/answer.ts';
import { runCorpus } from '../../../engine-parity/src/run-corpus.ts';

function candidatesInOrder(entry: CorpusEntry): string[] {
  return entry.problem.candidates
    .map((candidate) => (candidate.type === 'place' ? candidate.placeId : candidate.breakId))
    .sort((a, b) => (a > b) as unknown as number);
}

runCorpus((entry) => ({
  id: entry.id,
  answer: answerProblem(entry),
  candidates: candidatesInOrder(entry),
}));
