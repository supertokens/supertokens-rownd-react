import { NextResponse } from 'next/server';
import { withRowndMiddleware } from '@supertokens/rownd-nextjs/server';

export const middleware = withRowndMiddleware(() => {
  return NextResponse.next();
});

export const config = {
  matcher: ['/api/rownd-token-callback', '/profile/:path*'],
};
