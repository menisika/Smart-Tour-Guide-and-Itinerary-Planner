# 0014. Speech: Google Cloud synthesis behind a port, our own pronunciation dictionary, hosted recognition, AAC

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026. The choice of voice family is conditional on the listening comparison below. |
| **Amended** | 23 November 2026, confirmed by the owner — recognition is a hosted service behind its own port; synthesis follows the monthly free quota; no automatic stress step. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #11 "Speech" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `KNW-11`, `KNW-12`, `KNW-13`, `KNW-19`, `NFR-22`, `OUT-7`, `NFR-8`, `NFR-16`, `NFR-23`, `CUR-3` |

## Context

- Every Story has a Narration in Russian and in English (`KNW-11`).
- A pronunciation dictionary holds the stress and reading of names per entity; a Curator's correction must be audible in the regenerated Narration (`KNW-12`).
- Each Narration is transcribed back and compared with its text (`KNW-13`); the text follows the audio during playback (`OUT-7`).
- Narrations are prepared in advance and delivered as files; no speech service is called while a person listens.

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Google Cloud Text-to-Speech: free each month 4 million characters for Standard and WaveNet voices and 1 million for Chirp 3 HD. Russian exists in the Standard, WaveNet and Chirp 3 HD families. Markup counts as characters; beyond the quota Chirp 3 HD costs USD 30 per million. | [pricing](https://cloud.google.com/text-to-speech/pricing), voice list |
| Chirp 3 HD accepts SSML input including `<phoneme>` (release note, October 2025); custom pronunciations are listed as available for Russian. One user report says a custom pronunciation had no effect on an English voice. | [Chirp 3 HD](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd), release notes; forum report (unconfirmed) |
| Open speech models with a licence that allows commercial use and with Russian: Qwen3-TTS (Apache-2.0), Fun-CosyVoice3 (Apache-2.0), Chatterbox Multilingual (MIT). None documents control of stress; none publishes its speed on a processor. | [Qwen3-TTS](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice), [CosyVoice3](https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512), [Chatterbox](https://huggingface.co/ResembleAI/chatterbox) |
| The Russian models with documented "+" stress marks are non-commercial (Silero v5 Russian, F5-TTS Russian). | [Silero](https://github.com/snakers4/silero-models) |
| Stress placement: Silero Stress (MIT; the vendor states 60–70 % on unknown words) and RUAccent (MIT, with a custom dictionary; no published accuracy). | [Silero Stress](https://github.com/snakers4/silero-stress), [RUAccent](https://github.com/Den4ikAI/ruaccent) |
| Recognition: Whisper large-v3-turbo (MIT), Parakeet-tdt-0.6b-v3 (CC-BY-4.0; 5.5 % word error rate on Russian FLEURS), GigaAM v3 (MIT repository; Russian-first). | [Whisper](https://huggingface.co/openai/whisper-large-v3-turbo), [Parakeet](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), [GigaAM](https://github.com/salute-developers/GigaAM/blob/main/evaluation.md) |
| Hosted Whisper (large-v3-turbo) on Groq returns word-level timestamps and is reported at about USD 0.04 per hour of audio. | [Groq, speech to text](https://console.groq.com/docs/speech-to-text); price from third-party reviews |
| ElevenLabs and OpenAI speech do not serve Belarus. | [ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md) |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Google Cloud Text-to-Speech behind a port** | Same cloud and account; the free monthly quota covers Minsk in one to three months, depending on the voice family; a documented route to control pronunciation | A closed provider; pronunciation control for Russian must be confirmed by ear |
| **B. An open speech model on our own machines** | No provider, no cost | No documented stress control — `KNW-12` at risk; speed without a GPU unknown; Russian quality unverified |
| **C. Azure AI Speech** | Strong Russian voices; a custom lexicon | A second cloud account for one function; 0.5 million free characters a month — about half a year for Minsk |

## Decision

Option A.

1. **A `SpeechSynthesis` port** takes text with pronunciation hints and returns audio. The first adapter is Google Cloud Text-to-Speech; an open-model adapter is the fallback and the proof of replaceability (`NFR-23`).
2. **The pronunciation dictionary is ours** and independent of the provider: per entity and language it stores the stressed spelling and, where needed, a phonetic reading. Before synthesis the text is normalised (numbers, dates, abbreviations) and dictionary entries are applied; stress in ordinary words is left to the speech engine. The adapter translates hints into what its engine understands. A Curator can also fix the reading of an ordinary word inside one Story.
3. **A Curator's correction changes the dictionary entry**; Narrations that contain the entity are regenerated (`KNW-12`, `CUR-3`).
4. **Back-transcription (`KNW-13`) goes through a `SpeechRecognition` port.** The first adapter is hosted Whisper on Groq, the account already used for Wish interpretation ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)). Its word timings are stored with the Narration and drive the text that follows the audio (`OUT-7`). All of Minsk is about 50 hours of audio — about USD 2.
5. **Audio files are AAC (mono) in an M4A container** — played by iOS, Android and browsers without exceptions. A whole Route is about 18 MB against the 150 MB of `NFR-8`.
6. **First step before any bulk synthesis: a blind listening comparison** of 20–30 phrases with Minsk names — the Google voice families and one open model — which also confirms that pronunciation hints take effect in Russian. The voice family is chosen from it, with the quota in mind. The comparison also shows whether the engine misplaces stress in ordinary words often enough to need an automatic stress step — the one case that would bring a small Python job back ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)).
7. Requests to the speech services contain Story text or Narration audio only (`NFR-16`). Characters synthesised and hours recognised are recorded in the cost ledger, which holds a monthly budget for each ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md), `KNW-19`, `NFR-22`).
8. **Synthesis follows the monthly free quota.** With a Chirp 3 HD voice Minsk is voiced over about three months; with a WaveNet voice in one, if its pronunciation hints work. The budget in the ledger is a hard stop, not a warning: one month of impatience with Chirp 3 HD would cost about USD 51.

## Consequences

- If pronunciation hints do not work for the chosen voice, the fallback inside the same adapter is respelling the name in the text sent to the engine, with the displayed text unchanged; if that fails too, the provider changes behind the port.
- Narration in Belarusian stays out of scope (§9.1); nothing here blocks it.
- Regenerating audio after a correction, and the introduction and finale of each Route, draw on the same monthly quota; the budget of [ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md) keeps them inside it.

## Not verified

- That `<phoneme>` or custom pronunciations change the output for Russian voices — the listening comparison settles it.
- Quality of Russian and English voices on names (§10.4: "needs blind listening").
- The price of hosted recognition on the provider's own page; how often recognition disagrees with a correct Narration.
- Back-transcription cannot hear a wrong stress in a word that is spelled the same either way; only listening catches it.
- The estimate of 2.7 million characters for Minsk (300 Places, a base Story and three "More" blocks, two languages).
