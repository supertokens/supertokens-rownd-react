import { NextResponse } from 'next/server';
import { withRowndMiddleware } from '@supertokens/rownd-nextjs/server';
import { rowndServerConfig } from './rowndConfig';

export const middleware = withRowndMiddleware(() => {
  return NextResponse.next();
}, rowndServerConfig);

export const config = {
  matcher: ['/api/rownd-token-callback', '/profile/:path*'],
};
