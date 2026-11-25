/**
 * The `LanguageModel` port (ADR-0004, point 1): a chat completion whose output
 * is constrained by a JSON Schema.
 *
 * Privacy (ADR-0004, point 10; `NFR-16`): a request carries only the text the
 * task needs — no identifier of a person and no location finer than the city.
 */
export const LANGUAGE_MODEL = Symbol('LanguageModel');

export type JsonSchema = Readonly<Record<string, unknown>>;

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface LanguageModelRequest {
  /**
   * What the call is for, for example `wish-interpretation`. Configuration
   * maps a task to a model, and the cost ledger is kept per task (`KNW-19`).
   */
  readonly task: string;
  readonly messages: readonly ChatMessage[];
  /** The JSON Schema that the output must satisfy. */
  readonly outputSchema: JsonSchema;
  readonly maxOutputTokens: number;
}

export interface LanguageModelResponse {
  /** The model's answer, parsed, and valid against `outputSchema`. */
  readonly output: unknown;
  /** Recorded with every generated artefact (ADR-0004, point 9). */
  readonly model: string;
  readonly modelVersion: string;
  /** What the call consumed, for the cost ledger and its monthly budget. */
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface LanguageModel {
  complete(request: LanguageModelRequest): Promise<LanguageModelResponse>;
}
