import type { SpeechLanguage } from '../speech-language.ts';

/**
 * The `SpeechSynthesis` port (ADR-0014, point 1): text with pronunciation
 * hints in, audio out.
 *
 * A request carries Story text only (`NFR-16`).
 */
export const SPEECH_SYNTHESIS = Symbol('SpeechSynthesis');

/**
 * How one name is to be read, taken from our own pronunciation dictionary
 * (ADR-0014, point 2). The adapter translates a hint into whatever its engine
 * understands; the notation of the two readings is decided with the dictionary.
 */
export interface PronunciationHint {
  /** The name as it is spelled in the text. */
  readonly written: string;
  /** The same spelling with the stress marked, when the dictionary has one. */
  readonly stressedSpelling: string | null;
  /** A phonetic reading, for names that spelling alone does not settle. */
  readonly phoneticReading: string | null;
}

export interface SpeechSynthesisRequest {
  readonly text: string;
  readonly language: SpeechLanguage;
  readonly voice: string;
  readonly pronunciationHints: readonly PronunciationHint[];
}

export interface SpeechSynthesisResult {
  /** AAC, mono, in an M4A container (ADR-0014, point 5). */
  readonly audio: Uint8Array;
  readonly mediaType: 'audio/mp4';
  readonly voice: string;
  /** Characters the provider counts, markup included, for the cost ledger. */
  readonly billedCharacters: number;
}

export interface SpeechSynthesis {
  synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult>;
}
