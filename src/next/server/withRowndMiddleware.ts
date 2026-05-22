import {
  ROWND_COOKIE_ID,
  ROWND_TOKEN_CALLBACK_PATH,
  rowndCookie,
} from '../../ssr/server/cookie';
import { getRowndAuthenticationStatus } from '../../ssr/server/token';
import type { RowndServerConfig } from '../../ssr/server/token';

type NextResponse = any;
type NextRequest = any;

export const withRowndMiddleware = (
  middleware: (request: NextRequest) => NextResponse,
  config: RowndServerConfig
) => {
  return (request: NextRequest) => {
    if (request?.nextUrl?.pathname?.startsWith(ROWND_TOKEN_CALLBACK_PATH)) {
      return handleRowndTokenCallback(request);
    }

    return getRowndAuthenticationStatus(
      request.cookies.get(ROWND_COOKIE_ID)?.value || null,
      config
    ).then((tokenInfo) => {
      request.auth = tokenInfo;

      return middleware(request);
    });
  };
};

export function withRowndHandleRequest(
  handleRequest: (
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: any,
    loadContext: any
  ) => Promise<unknown>
) {
  return async function (
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: any,
    loadContext: any
  ) {
    const url = new URL(request.url);
    if (url.pathname === ROWND_TOKEN_CALLBACK_PATH) {
      return handleRowndTokenCallback(request);
    }

    return handleRequest(
      request,
      responseStatusCode,
      responseHeaders,
      remixContext,
      loadContext
    );
  };
}

export async function handleRowndTokenCallback(request: Request) {
  const body = request.body;
  try {
    const text = await new Response(body).text();
    const res = JSON.parse(text);

    const accessToken = res?.accessToken;
    if (!accessToken) {
      throw new Error('Missing access token');
    }

    return new Response('Success', {
      headers: {
        'Set-Cookie': rowndCookie.serialize({
          accessToken,
        }),
      },
    });
  } catch (err) {
    console.error('Failed to decode body text', err);
    return new Response('Failed', { status: 400 });
  }
}
