import { Global, Module } from '@nestjs/common';

import { type AdapterName, APP_CONFIG, type AppConfig } from '../platform/config/app-config.ts';
import { LANGUAGE_MODEL, type LanguageModel } from './language-model/language-model.port.ts';
import { ReplayLanguageModel } from './language-model/replay-language-model.adapter.ts';
import { RecordingStore } from './replay/recording-store.ts';
import { ReplaySpeechRecognition } from './speech-recognition/replay-speech-recognition.adapter.ts';
import {
  SPEECH_RECOGNITION,
  type SpeechRecognition,
} from './speech-recognition/speech-recognition.port.ts';
import { ReplaySpeechSynthesis } from './speech-synthesis/replay-speech-synthesis.adapter.ts';
import {
  SPEECH_SYNTHESIS,
  type SpeechSynthesis,
} from './speech-synthesis/speech-synthesis.port.ts';

/**
 * The adapters of each port, by the name configuration uses for them.
 *
 * Only replay adapters exist. A cloud adapter is one more value in the adapter
 * list of the configuration and one more entry here — the type checker asks
 * for the entry as soon as the value exists. Nothing that uses a port changes
 * (`NFR-23`).
 */
type Adapters<Port> = Readonly<Record<AdapterName, (recordings: RecordingStore) => Port>>;

const languageModelAdapters: Adapters<LanguageModel> = {
  replay: (recordings) => new ReplayLanguageModel(recordings),
};

const speechSynthesisAdapters: Adapters<SpeechSynthesis> = {
  replay: (recordings) => new ReplaySpeechSynthesis(recordings),
};

const speechRecognitionAdapters: Adapters<SpeechRecognition> = {
  replay: (recordings) => new ReplaySpeechRecognition(recordings),
};

/** Binds each model and speech port to the adapter that configuration names. */
@Global()
@Module({
  providers: [
    {
      provide: RecordingStore,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new RecordingStore(config.recordingsDir),
    },
    {
      provide: LANGUAGE_MODEL,
      inject: [APP_CONFIG, RecordingStore],
      useFactory: (config: AppConfig, recordings: RecordingStore) =>
        languageModelAdapters[config.adapters.languageModel](recordings),
    },
    {
      provide: SPEECH_SYNTHESIS,
      inject: [APP_CONFIG, RecordingStore],
      useFactory: (config: AppConfig, recordings: RecordingStore) =>
        speechSynthesisAdapters[config.adapters.speechSynthesis](recordings),
    },
    {
      provide: SPEECH_RECOGNITION,
      inject: [APP_CONFIG, RecordingStore],
      useFactory: (config: AppConfig, recordings: RecordingStore) =>
        speechRecognitionAdapters[config.adapters.speechRecognition](recordings),
    },
  ],
  exports: [LANGUAGE_MODEL, SPEECH_SYNTHESIS, SPEECH_RECOGNITION],
})
export class ModelPortsModule {}
