import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import SuperTokens from 'supertokens-node';
import { errorHandler, middleware } from 'supertokens-node/framework/express';
import Passwordless from 'supertokens-node/recipe/passwordless';
import Session from 'supertokens-node/recipe/session';
import ThirdParty from 'supertokens-node/recipe/thirdparty';
import UserMetadata from 'supertokens-node/recipe/usermetadata';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import RowndMigrationPlugin from '@supertokens-plugins/rownd-nodejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exampleRoot = path.resolve(__dirname, '..');
const exampleName = path.basename(exampleRoot);

loadEnvFile(path.join(exampleRoot, '.env'));

const backendPort = Number(process.env.EXAMPLE_BACKEND_PORT || 3137);
const frontendPort = Number(process.env.EXAMPLE_FRONTEND_PORT || 3000);
const apiDomain = `http://localhost:${backendPort}`;
const websiteDomain = `http://localhost:${frontendPort}`;
const hubBaseUrl = process.env.EXAMPLE_HUB_BASE_URL || 'https://d7e3fac3.supertokens-rownd-hub.pages.dev';
const appId = process.env.APP_ID || 'app_test_rownd';
const appKey = process.env.APP_KEY || 'test_app_key';
const rowndAppKey = requiredEnv('ROWND_APP_KEY');
const rowndAppSecret = requiredEnv('ROWND_APP_SECRET');
const connectionURI = requiredEnv('SUPERTOKENS_CONNECTION_URI');
const apiKey = process.env.SUPERTOKENS_API_KEY;
const googleClientId = requiredEnv('GOOGLE_CLIENT_ID');
const googleClientSecret = requiredEnv('GOOGLE_CLIENT_SECRET');

SuperTokens.init({
  debug: process.env.ENABLE_DEBUG_LOGS === 'true',
  supertokens: {
    connectionURI,
    ...(apiKey ? { apiKey } : {}),
  },
  appInfo: {
    appName: `Rownd Next.js Example (${exampleName})`,
    apiDomain,
    websiteDomain,
  },
  recipeList: [
    Session.init({
      exposeAccessTokenToFrontendInCookieBasedAuth: true,
    }),
    UserMetadata.init(),
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [
          {
            config: {
              thirdPartyId: 'google',
              clients: [
                {
                  clientId: googleClientId,
                  clientSecret: googleClientSecret,
                },
              ],
            },
          },
        ],
      },
    }),
    Passwordless.init({
      contactMethod: 'EMAIL',
      flowType: 'MAGIC_LINK',
      emailDelivery: {
        override: (originalImplementation) => ({
          ...originalImplementation,
          sendEmail: async function (input) {
            return originalImplementation.sendEmail({
              ...input,
              urlWithLinkCode: input.urlWithLinkCode?.replace('auth/verify', 'account/login'),
            });
          },
        }),
      },
    }),
  ],
  experimental: {
    plugins: [
      RowndMigrationPlugin.init({
        rowndAppKey,
        rowndAppSecret,
        enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true',
        appConfig: {
          id: appId,
          name: `Rownd Next.js Example: ${exampleName}`,
          signInMethods: [
            { method: 'google', clientId: googleClientId, iosClientId: googleClientId },
            { method: 'email' },
            { method: 'anonymous' },
          ],
        },
      }),
    ],
  },
});

const app = express();

app.use(
  cors({
    origin: websiteDomain,
    allowedHeaders: ['content-type', 'x-rownd-app-key', ...SuperTokens.getAllCORSHeaders()],
    exposedHeaders: ['front-token', 'st-access-token', 'anti-csrf'],
    credentials: true,
  }),
);
app.use(express.json());
app.use(middleware());

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', exampleName });
});

app.get('/example-bootstrap', (_req, res) => {
  res.json(getBootstrapConfig());
});

app.get('/applications/:appId/automations/mobile/pages', (_req, res) => {
  res.json({ results: [] });
});

app.get('/test/protected', verifySession(), (req, res) => {
  res.json({
    userId: req.session.getUserId(),
    accessTokenPayload: req.session.getAccessTokenPayload(),
  });
});

app.use(errorHandler());

app.listen(backendPort, () => {
  console.log(`Backend server listening on ${apiDomain}`);
});

function getBootstrapConfig() {
  return {
    supertokens: {
      appInfo: {
        appName: `Rownd Next.js Example (${exampleName})`,
        apiDomain,
        apiBasePath: '/auth',
      },
    },
    appKey,
    hubBaseUrl,
    exampleName,
  };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadEnvFile(envPath) {
  try {
    if (!fs.existsSync(envPath)) {
      return;
    }

    const source = fs.readFileSync(envPath, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = rawValue.replace(/^[']|[']$/g, '').replace(/^["]|["]$/g, '');
    }
  } catch (error) {
    throw new Error(`Failed to load ${envPath}: ${String(error)}`);
  }
}
