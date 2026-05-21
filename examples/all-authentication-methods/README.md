# All Authentication Methods React Example

This example starts two local processes:

- a Vite React frontend that imports the SDK from this repo's local `src`
- a local backend using `supertokens-node`, `Passwordless`, `ThirdParty`, and `@supertokens-plugins/rownd-nodejs`

It loads the Hub from `https://d7e3fac3.supertokens-rownd-hub.pages.dev`, uses a remote SuperTokens core via `SUPERTOKENS_CONNECTION_URI`, and requires real Google OAuth credentials. Apple login is disabled until credentials are available.

## Setup

1. Copy `.env.example` to `.env` and fill in the Rownd, SuperTokens, and Google OAuth values.
2. Run `npm install` in `examples/all-authentication-methods`.
3. In Google Cloud, add your frontend origin to the allowed JavaScript origins.
4. In Google Cloud, add your frontend callback URL to the allowed redirect URIs.
5. Make sure the port you configured in `.env` matches those Google OAuth settings.
6. Run `npm start`.

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3137/health`
- Hub assets: `https://d7e3fac3.supertokens-rownd-hub.pages.dev/static/scripts/rph.mjs`

## Scenarios

1. Open the frontend.
2. Use `Open Rownd auth UI` to test the full Hub method list.
3. Use the direct buttons to test email, Google, Google One Tap, and guest login.
4. After sign-in, fetch the protected resource to verify the SuperTokens session.

## Iframe Flow

1. Open the frontend.
2. Click `Authenticate in iframe`.
3. In the embedded page, click `Open Rownd auth UI` or `Direct Google login`.
4. The Hub detects the iframe context and uses the Google popup flow instead of a top-level redirect.

## Disabled Apple Flow

Apple is commented out in `backend/server.mjs` and `.env.example`. Uncomment those sections and add Apple credentials when you want to test it.
