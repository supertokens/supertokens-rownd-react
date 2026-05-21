# Rownd SuperTokens Next.js Example

Standalone Next.js example using `@rownd/next`, the SuperTokens Rownd plugin, and the deployed Rownd Hub bundle.

## Setup

1. Run `npm run build` from the repository root so `packages/next/dist` exists.
2. Copy `.env.example` to `.env` and fill in Rownd, SuperTokens, and Google OAuth values.
3. Run `npm install` in this directory.
4. In Google Cloud, add `http://localhost:3000` to allowed JavaScript origins.
5. In Google Cloud, add `http://localhost:3000/account/login` to allowed redirect URIs.
6. Run `npm start`.

## URLs

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3137/health`
- Hub assets: `https://d7e3fac3.supertokens-rownd-hub.pages.dev/static/scripts/rph.mjs`

## What This Tests

- `@rownd/next` provider setup with SuperTokens config.
- Client APIs from `useRownd()`.
- Server APIs from `@rownd/next/server` on `/profile`.
- SSR cookie sync via `RowndServerStateSync`.
- SuperTokens protected backend route at `/test/protected`.

## Required SSR Config

The Next server helpers validate SuperTokens access tokens using static env config:

```env
ROWND_SUPERTOKENS_API_DOMAIN=http://localhost:3137
ROWND_SUPERTOKENS_API_BASE_PATH=/auth
```

These values must match the backend `apiDomain` and SuperTokens `apiBasePath`.
