/**
 * The command-line driver that both engines run: it holds the planner, the
 * verifier, `routing` and the corpus in one script, and writes the answers.
 */
import { answerProblem } from './answer.ts';
import { runCorpus } from './run-corpus.ts';

runCorpus(answerProblem);
