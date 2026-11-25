import { z } from 'zod';

import { recordingKey, type RecordingStore, sha256Hex } from '../replay/recording-store.ts';
import type {
  SpeechRecognition,
  SpeechRecognitionRequest,
  SpeechRecognitionResult,
} from './speech-recognition.port.ts';

const recordingSchema = z.object({
  response: z.object({
    text: z.string(),
    words: z.array(
      z.object({
        text: z.string(),
        startMs: z.number().int().nonnegative(),
        endMs: z.number().int().nonnegative(),
      }),
    ),
    model: z.string().min(1),
    billedAudioMs: z.number().int().nonnegative(),
  }),
});

/**
 * What identifies a recognition request in the recordings: the audio enters
 * the key as its hash, so that the recording itself stays small and readable.
 */
export function recognitionRequestIdentity(request: SpeechRecognitionRequest): {
  audioSha256: string;
  mediaType: string;
  language: string;
} {
  return {
    audioSha256: sha256Hex(request.audio),
    mediaType: request.mediaType,
    language: request.language,
  };
}

/** Returns recorded transcripts and never calls a speech service. */
export class ReplaySpeechRecognition implements SpeechRecognition {
  constructor(private readonly recordings: RecordingStore) {}

  async transcribe(request: SpeechRecognitionRequest): Promise<SpeechRecognitionResult> {
    const key = recordingKey(recognitionRequestIdentity(request));
    const recording = await this.recordings.readRecording('speech-recognition', key);
    return recordingSchema.parse(recording).response;
  }
}
