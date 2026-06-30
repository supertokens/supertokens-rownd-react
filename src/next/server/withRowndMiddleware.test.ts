// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { ROWND_COOKIE_ID } from '../../ssr/server/cookie';
import { handleRowndTokenCallback } from './withRowndMiddleware';

describe('handleRowndTokenCallback', () => {
  it('sets the Rownd session cookie when accessToken is present', async () => {
    const response = await handleRowndTokenCallback(
      new Request('https://example.com/api/rownd-token-callback', {
        method: 'POST',
        body: JSON.stringify({ accessToken: 'test-token' }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain(ROWND_COOKIE_ID);
    expect(response.headers.get('Set-Cookie')).toContain('test-token');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=3600');
  });

  it('clears the Rownd session cookie when clear is present', async () => {
    const response = await handleRowndTokenCallback(
      new Request('https://example.com/api/rownd-token-callback', {
        method: 'POST',
        body: JSON.stringify({ clear: true }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain(ROWND_COOKIE_ID);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
