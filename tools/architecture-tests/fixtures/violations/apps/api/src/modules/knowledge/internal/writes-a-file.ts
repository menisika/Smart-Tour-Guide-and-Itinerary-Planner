// Breaks the rule: a file on the disk of the container instead of the object store.
import { writeFile } from 'node:fs/promises';

export const keepNarration = (audio: Uint8Array) => writeFile('/tmp/narration.m4a', audio);
