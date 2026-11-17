'use client';

import { useEffect, useRef } from 'react';
import { subscribeCookieSync } from '../cookieSync';
import { useRownd } from '../useRownd';

type RequireSignInProps = { isFallback: boolean; renderedUserId?: string };

const RequireSignIn = ({ isFallback, renderedUserId }: RequireSignInProps) => {
  const { is_initializing, requestSignIn, is_authenticated, is_signing_out } = useRownd();
  const wasAuthenticated = useRef(false);
  if (is_authenticated) wasAuthenticated.current = true;

  useEffect(() => subscribeCookieSync(false, isFallback, renderedUserId), [isFallback, renderedUserId]);

  useEffect(() => {
    if (!is_authenticated && !is_initializing && !is_signing_out &&
        isFallback && !wasAuthenticated.current) {
      requestSignIn({ prevent_closing: true });
    }
  }, [is_authenticated, is_initializing, is_signing_out, requestSignIn, isFallback]);

  return null;
};

export default RequireSignIn;
