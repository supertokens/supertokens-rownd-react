# Rownd SuperTokens Next.js Example

Standalone Next.js example using `@supertokens/rownd-nextjs`, the SuperTokens Rownd plugin, and the deployed SuperTokens Rownd Hub bundle.

The package is tested locally through `"@supertokens/rownd-nextjs": "file:../../packages/next"` in `package.json`; it does not need to be published first.

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
- Hub assets: `https://rownd-hub.supertokens.com/static/scripts/rph.mjs`

## What This Tests

- `@supertokens/rownd-nextjs` provider setup with SuperTokens config.
- Client APIs from `useRownd()`.
- Server APIs from `@supertokens/rownd-nextjs/server` on `/profile`.
- SSR cookie sync via `RowndServerStateSync`.
- SuperTokens protected backend route at `/test/protected`.

## SSR Config

The Next server helpers validate SuperTokens access tokens using config passed by the app. This example centralizes that in `src/rowndConfig.ts` and passes it to the provider, middleware, and `/profile` server helpers.

The config uses `EXAMPLE_BACKEND_PORT` to set `supertokens.appInfo.apiDomain` and hard-codes the example backend's `/auth` base path. These values must match the local backend config.
