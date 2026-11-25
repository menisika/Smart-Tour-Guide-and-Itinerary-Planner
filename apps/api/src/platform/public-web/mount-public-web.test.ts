import { describe, expect, it } from 'vitest';

import { isApiPath } from './mount-public-web.ts';

describe('isApiPath', () => {
  it.each(['/api', '/api/', '/api/routes/42', '/health', '/health/live'])(
    'leaves %s to the API',
    (path) => {
      expect(isApiPath(path)).toBe(true);
    },
  );

  it.each(['/', '/routes/42', '/invitations/abc', '/apiary', '/healthy', '/_expo/static/app.js'])(
    'gives %s to the public web',
    (path) => {
      expect(isApiPath(path)).toBe(false);
    },
  );
});
