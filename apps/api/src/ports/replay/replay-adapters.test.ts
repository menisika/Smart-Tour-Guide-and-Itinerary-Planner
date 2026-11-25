import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { LanguageModelRequest } from '../language-model/language-model.port.ts';
import { ReplayLanguageModel } from '../language-model/replay-language-model.adapter.ts';
import { ReplaySpeechRecognition } from '../speech-recognition/replay-speech-recognition.adapter.ts';
import { ReplaySpeechSynthesis } from '../speech-synthesis/replay-speech-synthesis.adapter.ts';
import type { SpeechSynthesisRequest } from '../speech-synthesis/speech-synthesis.port.ts';
import {
  canonicalJson,
  RecordingNotFoundError,
  recordingKey,
  RecordingStore,
} from './recording-store.ts';

/** The recordings that ship with the API: synthetic samples, marked as such. */
const store = new RecordingStore(fileURLToPath(new URL('../../../recordings', import.meta.url)));

const sampleCompletion: LanguageModelRequest = {
  task: 'skeleton-sample',
  messages: [
    { role: 'system', content: 'Answer with the JSON object that the schema describes.' },
    { role: 'user', content: 'Say that the replay adapter works.' },
  ],
  outputSchema: {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message'],
    additionalProperties: false,
  },
  maxOutputTokens: 64,
};

const sampleSynthesis: SpeechSynthesisRequest = {
  text: 'Sample.',
  language: 'en',
  voice: 'synthetic-sample',
  pronunciationHints: [],
};

describe('recording keys', () => {
  it('do not depend on the order of object keys', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null } })).toBe(
      canonicalJson({ a: { c: null, d: [2, 1] }, b: 1 }),
    );
    expect(recordingKey({ b: 1, a: 2 })).toBe(recordingKey({ a: 2, b: 1 }));
  });

  it('change when the request changes', () => {
    expect(recordingKey({ ...sampleCompletion, maxOutputTokens: 65 })).not.toBe(
      recordingKey(sampleCompletion),
    );
  });
});

describe('ReplayLanguageModel', () => {
  const languageModel = new ReplayLanguageModel(store);

  it('answers a recorded request with the recorded response', async () => {
    await expect(languageModel.complete(sampleCompletion)).resolves.toEqual({
      output: { message: 'The replay adapter works.' },
      model: 'synthetic-sample',
      modelVersion: '0',
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  });

  it('refuses a request that was never recorded, and names the missing file', async () => {
    const unrecorded = { ...sampleCompletion, task: 'never-recorded' };

    const failure = await languageModel.complete(unrecorded).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RecordingNotFoundError);
    expect((failure as RecordingNotFoundError).expectedPath).toMatch(
      new RegExp(`language-model/${recordingKey(unrecorded)}\\.json$`),
    );
  });
});

describe('ReplaySpeechSynthesis and ReplaySpeechRecognition', () => {
  const synthesis = new ReplaySpeechSynthesis(store);
  const recognition = new ReplaySpeechRecognition(store);

  it('returns the recorded audio, an MP4 container', async () => {
    const result = await synthesis.synthesize(sampleSynthesis);

    expect(result.mediaType).toBe('audio/mp4');
    expect(result.billedCharacters).toBe(7);
    // Bytes 4–7 of an MP4 file spell the name of its first box.
    expect(new TextDecoder().decode(result.audio.slice(4, 8))).toBe('ftyp');
  });

  it('transcribes that audio back with the recorded transcript', async () => {
    const { audio, mediaType } = await synthesis.synthesize(sampleSynthesis);

    await expect(recognition.transcribe({ audio, mediaType, language: 'en' })).resolves.toEqual({
      text: '',
      words: [],
      model: 'synthetic-sample',
      billedAudioMs: 300,
    });
  });

  it('refuses audio that was never recorded', async () => {
    const unknownAudio = new Uint8Array([1, 2, 3]);

    await expect(
      recognition.transcribe({ audio: unknownAudio, mediaType: 'audio/mp4', language: 'en' }),
    ).rejects.toBeInstanceOf(RecordingNotFoundError);
  });
});
