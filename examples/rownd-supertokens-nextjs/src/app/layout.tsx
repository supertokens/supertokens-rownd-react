import type { Metadata } from 'next';
import { RowndProvider } from '@supertokens/rownd-nextjs';
import {
  rowndAppKey,
  rowndHubBaseUrl,
  rowndServerConfig,
} from '../rowndConfig';
import './globals.css';

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
          appKey={rowndAppKey}
          hubUrlOverride={rowndHubBaseUrl}
          supertokens={rowndServerConfig.supertokens}
          children={children as never}
        />
      </body>
    </html>
  );
}
