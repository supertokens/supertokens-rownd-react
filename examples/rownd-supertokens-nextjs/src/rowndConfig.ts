import type { RowndServerConfig } from '@supertokens/rownd-nextjs/server';

const backendPort = process.env.EXAMPLE_BACKEND_PORT || '3137';
const apiBasePath = '/auth';

export const rowndAppKey = process.env.APP_KEY || 'test_app_key';

export const rowndHubBaseUrl =
  process.env.EXAMPLE_HUB_BASE_URL || 'https://rownd-hub.supertokens.com';

export const rowndServerConfig: RowndServerConfig = {
  supertokens: {
    appInfo: {
      appName: 'Rownd SuperTokens Next.js',
      apiDomain: `http://localhost:${backendPort}`,
      apiBasePath,
    },
  },
};
