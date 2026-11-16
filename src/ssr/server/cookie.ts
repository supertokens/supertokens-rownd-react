export type RowndCookieData = {
  accessToken: string;
};

export const ROWND_COOKIE_ID = 'rownd-session';

const createCookie = (id: string, path: string = '/') => {
  return {
    parse: (header: string | null): undefined | RowndCookieData => {
      if (!header) return undefined;
      const cookies = header.split(';');

      for (const cookie of cookies) {
        const [name, value] = cookie.split('=');

        if (decodeURIComponent(name.trim()) === id) {
          try {
            const parsedValue = JSON.parse(decodeURIComponent(value.trim()));
            return parsedValue;
          } catch (err) {
            console.error('Failed to parse cookie', err);
            return undefined;
          }
        }
      }

      return undefined;
    },
    serialize: (
      data: RowndCookieData,
      { maxAge = 3600 }: { maxAge?: number } = {}
    ): string => {
      let cookie = `${encodeURIComponent(id)}=${encodeURIComponent(
        JSON.stringify(data)
      )}`;

      cookie += '; Secure';
      cookie += '; HttpOnly';
      cookie += `; Max-Age=${maxAge}`;
      cookie += '; SameSite=Strict';
      cookie += `; Path=${path}`;

      return cookie;
    },
    clear: (): string => {
      let cookie = `${encodeURIComponent(id)}=`;

      cookie += '; Secure';
      cookie += '; HttpOnly';
      cookie += '; Max-Age=0';
      cookie += '; SameSite=Strict';
      cookie += `; Path=${path}`;

      return cookie;
    },
  };
};

export const ROWND_TOKEN_CALLBACK_PATH = '/api/rownd-token-callback';

let cookieQueue: Promise<unknown> = Promise.resolve();

function writeCookie(body: { accessToken: string } | { clear: true }): Promise<void> {
  const request = cookieQueue.then(async () => {
    const response = await fetch(ROWND_TOKEN_CALLBACK_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Cookie callback failed: ${response.status}`);
    }
  });
  // A failed request must not prevent subsequent invalidation attempts.
  cookieQueue = request.catch(() => {});
  return request;
}

export const setCookie = async (token: string): Promise<string | undefined> => {
  try {
    await writeCookie({ accessToken: token });
    return token;
  } catch (err) {
    console.error('Failed to set cookie: ', err);
    return undefined; 
  }
};

export const clearCookie = async (): Promise<void> => {
  await writeCookie({ clear: true });
};

export const rowndCookie = createCookie(ROWND_COOKIE_ID);
