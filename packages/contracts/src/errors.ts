import { z } from 'zod';

/**
 * The one envelope every error answer of the API uses (ADR-0025, point 5).
 *
 * `code` is stable and is what clients switch on; the text shown to a person
 * is chosen on the client by code and language. `message` is for developers.
 * The list of codes grows with the API; it is deliberately not an enum yet.
 */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
