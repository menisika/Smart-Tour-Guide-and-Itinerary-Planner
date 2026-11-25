# 0004. Language models: cloud-hosted models behind one port, two adapters, the model chosen by comparison

| | |
|---|---|
| **Status** | Accepted — first confirmed by the product owner on 22 November 2026; revised and confirmed on 23 November 2026 |
| **Revision** | The first version made free tiers and a model on the developer's machine the main route. The owner then stated that the machine is too weak for that and that a small spend on cloud models is acceptable. The port is unchanged; what stands behind it changed. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #9 "Language models" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `NFR-23`, `NFR-16`, `NFR-11`, `NFR-22`, `NFR-33`, `KNW-4`, `KNW-5`, `KNW-7`, `KNW-8`, `KNW-19`, `KNW-20`, `KNW-22`, `RTE-2`, `NFR-36` |

This record decides *how* models are reached and *where* they run. The statement verifier (fork #10) and speech (fork #11) are decided separately.

## Context

- Language models do two kinds of work.
  - **Preparation**, in the background with no person present: extracting facts from Belarusian, Russian and English sources and generating Stories in Russian and English (`KNW-4…8`, `KNW-20`).
  - **At request time**, on behalf of a person: turning a Wish into a closed set of constraints (`RTE-2`, `NFR-36`); "ask the guide" follows in S3 (`KNW-22`).
- The first market is Belarus, so the people served are located there. The account is registered in Poland and the developer works from Poland (owner's statement, 23 November 2026).
- The model must be replaceable, including a different provider per region (`NFR-23`); requests carry no identifier of the person (`NFR-16`).
- The owner's spending ceiling is USD 20 for everything; model spend for the first city should be a few dollars. Evaluation runs are to stay few and small.

### What the providers' own pages say (read 22–23 November 2026)

| Subject | Finding | Source |
|---|---|---|
| OpenAI, Anthropic, Gemini API (AI Studio) | Belarus is unsupported. The wording covers the developer's own location as well as end users: Anthropic counts use "by persons while physically located in an unsupported region, including users and personnel of otherwise supported entities" as unsupported; OpenAI may block an account for "accessing or offering access" outside its list; Gemini may be accessed, and offered to users, only "within an available region". | [OpenAI](https://developers.openai.com/api/docs/supported-countries), [Anthropic](https://www.anthropic.com/supported-countries), [Gemini terms](https://aistudio.google.com/docs/terms) |
| Vertex AI on Google Cloud | Governed by the Google Cloud terms, which have no country list for generative models; Google's own regions page for the Gemini API points developers outside its list to Google Cloud. Generative services may not be used in services "directed towards or … likely to be accessed by" people under 18. | [service terms](https://cloud.google.com/terms/service-terms), [Gemini regions](https://aistudio.google.com/docs/available-regions) |
| Groq | No country list; compliance with export-control law; no clause on the location of the developer or of end users. Strict JSON-schema output. | [services agreement](https://console.groq.com/docs/legal/services-agreement) |
| Mistral, DeepSeek, Together | No country list; clauses about comprehensively sanctioned countries, which name neither Belarus nor Russia. | providers' terms |
| Fireworks, GigaChat | Fireworks excludes residents of any country under US sanctions; GigaChat accepts only residents of Russia. | providers' terms |

### Prices and what they mean for the first city

Preparing 300 Places is estimated at 23.1 million input and 2.5 million output tokens (77 000 and 8 300 per Place). Prices are per million tokens, input / output.

| Route | Model | Price | 300 Places |
|---|---|---|---|
| Groq | gpt-oss-20b | 0.075 / 0.30 | USD 2.48 |
| Groq | gpt-oss-120b | 0.15 / 0.60 | USD 4.96 |
| DeepSeek | flash, off-peak | 0.15 / 0.60 | USD 4.96 |
| AWS Bedrock | Qwen3-235B, batch | 0.145 / 0.58 | USD 4.79 |
| Together | DeepSeek V4.1 Flash | 0.30 / 1.20 | USD 9.92 |
| Vertex AI | Gemini 3.1 Flash-Lite | 0.25 / 1.50 | USD 9.51 |

A thousand Wish interpretations cost between USD 0.05 and USD 0.43 on any of them.

### What is known about quality

- On a Russian knowledge benchmark (MMLU-ProX, 5-shot): DeepSeek-V3 74.9, Qwen3-235B 72.9, Qwen3-32B 68.0, Mistral Small 3.1 59.2. No Russian score exists for gpt-oss, for Gemini Flash-Lite or for Mistral Small 4.
- On a grounded-summary hallucination board, which is English only: Gemini 2.5 Flash-Lite 3.3 %, Qwen3-8B 4.8 %, gpt-oss-120b 14.2 %.
- No evaluation of any model on reading Belarusian sources was found.

The evidence does not single out a model.

### A model on the developer's machine

No measurement exists for the developer's exact processor. On chips of the same generation an 8–9B model generates 14–15 tokens a second and a dense 27B model 3.6. That puts one Place at 7–15 minutes and Minsk at 35–75 hours, and a Wish interpretation by a 3–4B model at 7–9 seconds. Intel archived its own library for these chips in January 2026. A local model is not a workable main route.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Cloud models behind the port, two adapters, model chosen by a comparison** | Costs a few dollars; both model families can be compared on our own material; replaceability is exercised from the first day | Paid; Preparation depends on providers; one new account |
| **B. Open-weight models in the cloud only** | About USD 5 for Minsk; several hosts serve the same model, so no provider can switch the product off | Drops the candidate with the best known hallucination figure; the cheapest open model has no Russian data |
| **C. Everything on Vertex AI** | One account, no keys | Wish interpretation faces the person, and Google's terms exclude services likely to be accessed by minors; one closed vendor; replaceability only on paper |
| **D. Free tiers and a local model** (the first version of this record) | USD 0 | 35–75 hours of laptop time for Minsk, or weeks on free quotas; rejected by the owner |

## Decision

Option A.

1. **One port, `LanguageModel`:** a chat completion whose output is constrained by a JSON Schema.
2. **Two adapters exist from S1.**
   - *Vertex AI* (Gemini) through the Google Cloud account the system already has; no key to store.
   - *OpenAI-compatible*, for hosts of open-weight models; Groq is the first host, and any other host of the same protocol is a change of address and key.
3. **Wish interpretation runs on a small open model on Groq**, with strict JSON-schema output. It is not placed on Vertex AI, because it faces the person.
4. **The model for Preparation is chosen by a comparison on ten Places of Minsk** between Gemini Flash-Lite on Vertex AI and a strong open model of the Qwen3-235B or DeepSeek class. The owner reads the results. What is compared: facts extracted from Belarusian sources, the share of statements that survive the check of [ADR-0013](0013-statement-verification-entailment-model-then-judge.md), and how the Stories read. The comparison costs cents.
5. **The judge of ADR-0013 is a model of a different family from the generator** — with two adapters in place that is a configuration choice.
6. **No model runs on the developer's machine as part of the product.** In the local environment the port is served by an adapter that replays recorded responses; a developer may point it at a cloud adapter with a key of their own (`NFR-33`).
7. **Spend is capped by the system, not by attention:** the cost ledger of [ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md) holds a monthly token budget per provider, and Preparation stops when it is reached (`NFR-22`, [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
8. **OpenAI, Anthropic and the Gemini API are not used.** An adapter for another region can be added later without touching the rest (`NFR-23`).
9. **Every generated artefact records the model and its version** — required for reproducibility of place scoring (`RTE-8` rule) and for cost per component (`KNW-19`).
10. **Privacy (`NFR-16`).** A request contains only the text the task needs: no identifier of the person and no location finer than the city. Keys stay on the server.
11. **Evaluation economy.** Test sets are small and fixed (Wish → constraints for `NFR-36`; a sample of statements for `NFR-18`). Responses are cached by model and prompt; automated checks replay the cache and never call a model.
12. **Degradation (`NFR-11`).** With no model reachable, a Wish is reported as not understood and the Route is built from the Profile alone; Preparation steps wait and resume.

## Consequences

- Preparing Minsk costs an estimated USD 5–10 and takes hours of unattended cloud work, not days of laptop time.
- Preparation now depends on external providers being reachable and on their terms staying as they are. Two adapters in use limit the damage of losing one.
- Story quality still rests on the statement check and on Curator verification, which the Reference City requires anyway.
- The 90 % target of `NFR-36` with a small model is unproven until measured on the labelled set.

## Not verified

- Whether the three closed providers allow content generated in the background to be delivered to people in Belarus. With the developer in Poland this is the one open question for using them in Preparation, and none of their texts answers it; they stay excluded unless a provider confirms it in writing. Not needed for this decision.
- That Belarus is not "comprehensively sanctioned" in the sense of the clauses of Groq, Mistral, DeepSeek and Together — a legal reading, deferred with §9.3.
- The absence of a country restriction for generative models on Google Cloud: none was found, which is not proof.
- JSON-schema support, rate limits and minimum top-ups of most providers; current prices beyond the day they were read.
- Russian and Belarusian quality of the candidates — the comparison of point 4 is the measurement.
- The token estimate per Place: reasoning tokens and prompt caching are not included.
