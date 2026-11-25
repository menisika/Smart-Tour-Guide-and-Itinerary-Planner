# 0013. Statement verification: a local entailment model first, a second language model for doubtful cases

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — the entailment model runs under ONNX in the TypeScript worker; model calls are paid. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #10 "Verification of statements" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `KNW-8`, `KNW-9`, `KNW-16`, `NFR-18`, `KNW-19`, `NFR-23` |

## Context

- Every factual statement of a Story maps to facts of the Dossier, and before a Story is available each one is checked automatically; a statement that fails is removed, and a Story with too little left is withheld (`KNW-8`, `KNW-9`).
- Two measures apply (`NFR-18`): a Dossier fact is found for at least 98 % of factual statements, and for at least 95 % of a human-checked sample the cited source supports the statement.
- Language-model calls are paid per token ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)); the fewer sentences need a model, the cheaper Preparation is.

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| `mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`: 0.3 billion parameters, MIT licence, Russian included; accuracy 0.803 on the Russian part of the XNLI benchmark. It runs on a processor; a build for ONNX under Node.js is published. | [model card](https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7), [ONNX build](https://huggingface.co/Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7) |
| The fact-checking models with the best published results (MiniCheck family, AlignScore) are English-only or non-commercial. | [MiniCheck](https://huggingface.co/lytang/MiniCheck-Flan-T5-Large), [Bespoke-MiniCheck](https://huggingface.co/bespokelabs/Bespoke-MiniCheck-7B), [AlignScore](https://github.com/yuh-zha/AlignScore) |
| No published evaluation of any of these on fact-checking in Russian was found. | absence, after search |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Entailment model, then a language model as judge for doubtful cases** | Every sentence is checked at almost no cost; paid model calls are spent only where needed | Two components; thresholds must be set on our own labelled data |
| **B. Entailment model only** | Cheapest and fastest | 0.80 accuracy on a general benchmark makes `NFR-18` doubtful with nothing to settle borderline cases |
| **C. A language model as judge for every sentence** | One component; higher expected quality | Every sentence of every Story is a paid call; checking would cost about as much as generating |

## Decision

Option A.

1. **The generator returns a Story as sentences, each labelled factual or non-factual and, when factual, carrying the identifiers of the Dossier facts it rests on.** The same structure provides sources one tap away (`KNW-16`) and makes the first measure of `NFR-18` mechanical.
2. **Step 1 — entailment.** A multilingual entailment model, run inside the worker under ONNX, tests each factual sentence against its cited facts. Above an upper threshold the sentence passes; below a lower one it fails.
3. **Step 2 — judge.** Sentences between the thresholds go to a language model of a different family from the generator, through the port of ADR-0004, with the sentence and the cited facts only.
4. **A failed sentence is removed.** If the remaining Story falls below a minimum length or loses its hook, it is withheld and the Place goes without a Story (`KNW-6`, `KNW-9`).
5. **Sentences labelled non-factual are spot-checked by the same entailment model for smuggled facts** (numbers, dates, names) — a cheap guard on the classification of `KNW-8`.
6. **Thresholds are set on a small human-labelled sample** of sentence–fact pairs in Russian and English. The same sample is the one `NFR-18` requires; it is labelled once and reused, in line with the owner's request to keep evaluation small.
7. **The verifier is behind a port** and replaceable (`NFR-23`).

## Consequences

- Verification needs no paid call for the bulk of sentences.
- The 98 % and 95 % thresholds are not known to be reachable with these components until the labelled sample exists; if they are not, the first lever is the judge's share, the second a stronger generator.
- Cost per component (`KNW-19`) records judge calls separately from generation.

## Not verified

- Accuracy of the entailment model on our task — statements against atomic facts, in Russian — as opposed to a general benchmark.
- Agreement between the automatic check and the human reviewer.
