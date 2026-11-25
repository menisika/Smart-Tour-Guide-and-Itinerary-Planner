import { z } from 'zod';

import { recordingKey, type RecordingStore } from '../replay/recording-store.ts';
import type {
  LanguageModel,
  LanguageModelRequest,
  LanguageModelResponse,
} from './language-model.port.ts';

const recordingSchema = z.object({
  response: z.object({
    output: z.unknown(),
    model: z.string().min(1),
    modelVersion: z.string().min(1),
    usage: z.object({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
    }),
  }),
});

/**
 * Answers from recorded responses and never calls a model. It serves the port
 * in the local environment and in every automated check.
 */
export class ReplayLanguageModel implements LanguageModel {
  constructor(private readonly recordings: RecordingStore) {}

  async complete(request: LanguageModelRequest): Promise<LanguageModelResponse> {
    const recording = await this.recordings.readRecording('language-model', recordingKey(request));
    return recordingSchema.parse(recording).response;
  }
}
