# SuperTokens Rownd Next.js SDK

Next.js bindings for the SuperTokens Rownd Hub. This package wraps the React SDK with App Router helpers, middleware support, and server utilities for reading Rownd/SuperTokens auth state.

## Installation

```bash
npm install @supertokens/rownd-nextjs
# or
yarn add @supertokens/rownd-nextjs
```

## Provider Setup

Add `RowndProvider` in your root `layout.tsx`.

```tsx
import { RowndProvider } from '@supertokens/rownd-nextjs';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RowndProvider
          appKey="<your Rownd app key>"
          supertokens={{
            appInfo: {
              appName: 'My App',
              apiDomain: 'http://localhost:3001',
              apiBasePath: '/auth',
            },
          }}
        >
          {children}
        </RowndProvider>
      </body>
    </html>
  );
}
```

Do not manually include the Hub snippet in your HTML. The provider injects the SuperTokens Rownd Hub bundle for you.

## RowndProvider Props

| Prop | Required | Default | Description |
| --- | --- | --- | --- |
| `appKey` | Yes | - | Rownd app key used by the Hub. |
| `supertokens` | Yes | - | SuperTokens app config passed to the Hub. |
| `hubUrlOverride` | No | `https://rownd-hub.supertokens.com` | Alternate SuperTokens Rownd Hub URL. Mostly used for staging or local Hub development. |
| `apiUrl` | No | - | Legacy Rownd API URL override, forwarded to the Hub as `setLegacyRowndApiUrl`. |
| `rootOrigin` | No | - | Root origin for multi-domain deployments. |
| `postRegistrationUrl` | No | - | URL the Hub should use after registration when that flow needs a redirect. |
| `postSignOutRedirect` | No | - | URL the Hub should redirect to after sign-out. |
| `apiVersion` | No | `2026-01-21` | Hub API version date. Set an earlier date to opt out of newer Hub behavior. |

`supertokens` has this shape:

```ts
type SuperTokensConfig = {
  appInfo: {
    appName?: string;
    apiDomain: string;
    apiBasePath?: string;
  };
};
```

`apiDomain` and `apiBasePath` must match the SuperTokens backend that the Hub should use for session creation and refresh.

## Middleware Setup

Add the middleware wrapper and include the Rownd token callback path in the matcher.

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withRowndMiddleware } from '@supertokens/rownd-nextjs/server';
import type { RowndServerConfig } from '@supertokens/rownd-nextjs/server';

const rowndServerConfig: RowndServerConfig = {
  supertokens: {
    appInfo: {
      apiDomain: 'http://localhost:3001',
      apiBasePath: '/auth',
    },
  },
};

export const middleware = withRowndMiddleware((request: NextRequest) => {
  return NextResponse.next();
}, rowndServerConfig);

export const config = {
  matcher: [
    '/api/rownd-token-callback',
    '/protected/:path*',
  ],
};
```

`withRowndMiddleware` handles `/api/rownd-token-callback` and attaches parsed auth information to `request.auth` before your middleware runs.

## Server Config

Server helpers validate SuperTokens access tokens using config passed by your app. The SDK does not read SuperTokens settings from `process.env`.

The same `supertokens` config should be passed to `RowndProvider`, `withRowndMiddleware`, and any server helper that reads auth state.

## Server Utilities

```tsx
import {
  getRowndAccessToken,
  getRowndUser,
  getRowndUserId,
  isAuthenticated,
} from '@supertokens/rownd-nextjs/server';
import type { RowndServerConfig } from '@supertokens/rownd-nextjs/server';
import { cookies } from 'next/headers';

const rowndServerConfig: RowndServerConfig = {
  supertokens: {
    appInfo: {
      apiDomain: 'http://localhost:3001',
      apiBasePath: '/auth',
    },
  },
};

export default async function ProfilePage() {
  const authenticated = await isAuthenticated(cookies, rowndServerConfig);
  const user = await getRowndUser(cookies, rowndServerConfig);
  const userId = await getRowndUserId(cookies, rowndServerConfig);
  const accessToken = await getRowndAccessToken(cookies, rowndServerConfig);

  if (!authenticated) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>User ID: {userId}</h1>
      <p>Email: {user?.data?.email}</p>
      <p>Access token: {accessToken}</p>
    </div>
  );
}
```

## Protected Pages

Use `withRowndRequireSignIn` to require sign-in for a page.

```tsx
import { cookies } from 'next/headers';
import { withRowndRequireSignIn } from '@supertokens/rownd-nextjs';
import { getRowndUser } from '@supertokens/rownd-nextjs/server';

const rowndServerConfig = {
  supertokens: {
    appInfo: {
      apiDomain: 'http://localhost:3001',
      apiBasePath: '/auth',
    },
  },
};

async function ProtectedPage() {
  const user = await getRowndUser(cookies, rowndServerConfig);

  return <h1>Welcome {user?.data?.email ?? user?.data?.user_id}</h1>;
}

function AuthFallback() {
  return <div>Please sign in to continue...</div>;
}

export default withRowndRequireSignIn(
  ProtectedPage,
  cookies,
  AuthFallback,
  rowndServerConfig
);
```

## Client Usage

Use `useRownd()` in client components.

```tsx
'use client';

import { useRownd } from '@supertokens/rownd-nextjs';

export function AuthControls() {
  const { is_authenticated, is_initializing, requestSignIn, signOut } =
    useRownd();

  if (is_initializing) {
    return <button disabled>Loading...</button>;
  }

  if (is_authenticated) {
    return <button onClick={() => signOut()}>Sign out</button>;
  }

  return <button onClick={() => requestSignIn()}>Sign in</button>;
}
```

## Exports

Client exports from `@supertokens/rownd-nextjs`:

| Export | Description |
| --- | --- |
| `RowndProvider` | Injects the Hub and provides auth state. |
| `useRownd` | Reads Hub state and methods in client components. |
| `withRowndRequireSignIn` | Protects pages/components that require authentication. |
| `RowndServerStateSync` | Syncs server-read auth state into the client store. |

Server exports from `@supertokens/rownd-nextjs/server`:

| Export | Description |
| --- | --- |
| `withRowndMiddleware` | Handles the token callback route and attaches auth data to middleware requests. |
| `getRowndUser` | Reads the current Rownd user from cookies. |
| `getRowndUserId` | Reads the current Rownd user ID from cookies. |
| `getRowndAccessToken` | Reads the current access token from cookies. |
| `isAuthenticated` | Returns whether the current request has an authenticated Rownd/SuperTokens session. |
