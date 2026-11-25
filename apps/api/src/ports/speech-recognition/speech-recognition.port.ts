import type { SpeechLanguage } from '../speech-language.ts';

/**
 * The `SpeechRecognition` port (ADR-0014, point 4): a Narration is transcribed
 * back and compared with its text (`KNW-13`); the word timings drive the text
 * that follows the audio (`OUT-7`).
 *
 * A request carries Narration audio only (`NFR-16`).
 */
export const SPEECH_RECOGNITION = Symbol('SpeechRecognition');

export interface SpeechRecognitionRequest {
  readonly audio: Uint8Array;
  readonly mediaType: string;
  readonly language: SpeechLanguage;
}

export interface RecognizedWord {
  readonly text: string;
  /** Offsets from the start of the audio, in whole milliseconds. */
  readonly startMs: number;
  readonly endMs: number;
}

export interface SpeechRecognitionResult {
  readonly text: string;
  readonly words: readonly RecognizedWord[];
  readonly model: string;
  /** Length of audio the provider counts, for the cost ledger. */
  readonly billedAudioMs: number;
}

export interface SpeechRecognition {
  transcribe(request: SpeechRecognitionRequest): Promise<SpeechRecognitionResult>;
}
