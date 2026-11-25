import { z } from 'zod';

import { recordingKey, type RecordingStore } from '../replay/recording-store.ts';
import type {
  SpeechSynthesis,
  SpeechSynthesisRequest,
  SpeechSynthesisResult,
} from './speech-synthesis.port.ts';

const recordingSchema = z.object({
  response: z.object({
    /** Name of the audio file that lies next to the recording. */
    audioFile: z.string().min(1),
    mediaType: z.literal('audio/mp4'),
    voice: z.string().min(1),
    billedCharacters: z.number().int().nonnegative(),
  }),
});

/** Returns recorded audio and never calls a speech service. */
export class ReplaySpeechSynthesis implements SpeechSynthesis {
  constructor(private readonly recordings: RecordingStore) {}

  async synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult> {
    const key = recordingKey(request);
    const recording = await this.recordings.readRecording('speech-synthesis', key);
    const { audioFile, mediaType, voice, billedCharacters } =
      recordingSchema.parse(recording).response;

    return {
      audio: await this.recordings.readAttachment('speech-synthesis', key, audioFile),
      mediaType,
      voice,
      billedCharacters,
    };
  }
}
