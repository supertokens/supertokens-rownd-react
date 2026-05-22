import type { Metadata } from 'next';
import { RowndProvider } from '@supertokens/rownd-nextjs';
import './globals.css';

const backendPort = process.env.EXAMPLE_BACKEND_PORT || '3137';
const apiDomain = process.env.ROWND_SUPERTOKENS_API_DOMAIN || `http://localhost:${backendPort}`;
const apiBasePath = process.env.ROWND_SUPERTOKENS_API_BASE_PATH || '/auth';
const appKey = process.env.APP_KEY || 'test_app_key';
const hubBaseUrl = process.env.EXAMPLE_HUB_BASE_URL || 'https://d7e3fac3.supertokens-rownd-hub.pages.dev';

export const metadata: Metadata = {
  title: 'Rownd SuperTokens Next.js',
  description: 'Next.js example using Rownd APIs backed by SuperTokens.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RowndProvider
          appKey={appKey}
          hubUrlOverride={hubBaseUrl}
          supertokens={{
            appInfo: {
              appName: 'Rownd SuperTokens Next.js',
              apiDomain,
              apiBasePath,
            },
          }}
          children={children as never}
        />
      </body>
    </html>
  );
}
