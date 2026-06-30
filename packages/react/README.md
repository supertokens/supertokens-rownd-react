# SuperTokens Rownd React SDK

React bindings for the SuperTokens Rownd Hub. The SDK injects the SuperTokens Rownd Hub script, keeps React state in sync with the Hub, and exposes auth helpers through `useRownd()`.

For Next.js, use `@supertokens/rownd-nextjs` and see `packages/next/README.md`.

## Installation

```bash
npm install @supertokens/rownd-react
# or
yarn add @supertokens/rownd-react
```

## Provider Setup

Add `RowndProvider` near the root of your React app.

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RowndProvider } from '@supertokens/rownd-react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
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
    <App />
  </RowndProvider>
);
```

Do not manually include the Hub snippet in your HTML. The provider injects the SuperTokens Rownd Hub bundle for you.

## RowndProvider Props

| Prop | Required | Default | Description |
| --- | --- | --- | --- |
| `appKey` | Yes | - | Rownd app key used by the Hub. |
| `supertokens` | Yes | - | SuperTokens app config passed to the Hub. |
| `hubUrlOverride` | No | `https://rownd-hub.supertokens.com` | Alternate SuperTokens Rownd Hub URL. Mostly used for staging or local Hub development. |
| `rootOrigin` | No | - | Root origin for multi-domain deployments. |
| `clientDomain` | No | - | Client-domain key forwarded to the Hub. Use this with the Rownd plugin `clientDomains` map to choose the frontend base URL used in magic and verification links. |
| `postLoginRedirect` | No | - | Default URL/path the Hub should use after sign-in, including magic-link and email-verification completion. |
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

For multi-domain deployments, configure a default client domain and post-login redirect on the provider:

```tsx
<RowndProvider
  appKey={rowndAppKey}
  supertokens={supertokens}
  clientDomain="browser_local"
  postLoginRedirect="/profile"
>
  <App />
</RowndProvider>
```

## useRownd

Use `useRownd()` inside provider children to read auth state and call Hub APIs.

```tsx
import { useEffect } from 'react';
import { useRownd } from '@supertokens/rownd-react';

export function ProtectedContent() {
  const {
    is_authenticated,
    is_initializing,
    user,
    requestSignIn,
    signOut,
    getAccessToken,
  } = useRownd();

  useEffect(() => {
    if (!is_initializing && !is_authenticated) {
      requestSignIn();
    }
  }, [is_authenticated, is_initializing, requestSignIn]);

  if (is_initializing) {
    return <div>Loading...</div>;
  }

  if (!is_authenticated) {
    return <button onClick={() => requestSignIn()}>Sign in</button>;
  }

  return (
    <div>
      <p>Welcome {user.data.email ?? user.data.user_id}</p>
      <button onClick={() => signOut()}>Sign out</button>
      <button onClick={() => getAccessToken({ waitForToken: true })}>
        Get access token
      </button>
    </div>
  );
}
```

## Common Methods

| Method | Description |
| --- | --- |
| `requestSignIn(options?)` | Opens the Hub sign-in UI. |
| `signOut()` | Signs out the current user. |
| `getAccessToken(options?)` | Gets the current Rownd/SuperTokens access token. Use `{ waitForToken: true }` when making authenticated API calls. |
| `setUser(data)` | Merges data into the Rownd user profile. |
| `setUserValue(key, value)` | Updates one user profile field. |
| `manageAccount()` | Opens the Hub account management UI. |
| `getAppConfig()` | Reads the active Hub app config. |
| `onAuthenticated(callback)` | Runs a callback when a user becomes authenticated. Returns an unsubscribe function. |

## Authenticated Requests

Call `getAccessToken({ waitForToken: true })` before requests that require the SuperTokens session.

```ts
import { useRownd } from '@supertokens/rownd-react';

export function ProtectedRequestButton() {
  const { getAccessToken } = useRownd();

  async function callApi() {
    const accessToken = await getAccessToken({ waitForToken: true });

    const response = await fetch('/api/protected', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.json();
  }

  return <button onClick={callApi}>Call protected API</button>;
}
```

## Sign-In Options

```ts
requestSignIn({
  identifier: 'me@company.com',
  auto_sign_in: false,
  method: 'email',
  post_login_redirect: '/profile',
});
```

Supported fields include `identifier`, `auto_sign_in`, `init_data`, `post_login_redirect`, `include_user_data`, `redirect`, `intent`, `group_to_join`, `prevent_closing`, `method`, and method-specific `method_options`.
