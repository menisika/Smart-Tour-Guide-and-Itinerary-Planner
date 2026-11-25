// VIOLATION (packages-not-to-apps): a shared package imports an application.
import { app } from '../../../apps/api/src/app.ts';

export const fromApp = app;
