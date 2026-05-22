import React from 'react';
import { getRowndAuthenticationStatus } from '../../ssr/server/token';
import type { RowndAuthenticatedUser, RowndServerConfig } from '../../ssr/server/token';
import { ROWND_COOKIE_ID } from '../../ssr/server/cookie';
import RequireSignIn from './components/RequireSignIn';
import { RequestCookiesFn } from '../server/getRowndUser';

type ReactServerComponent<Props> = (props: Props) => React.ReactNode;

type WithRowndRequireSignInOptions = RowndServerConfig & {
  onUnauthenticated?: () => void;
};

const withRowndRequireSignIn = <P extends object>(
  WrappedComponent: ReactServerComponent<P>,
  cookies: RequestCookiesFn,
  Fallback: React.ComponentType,
  options: WithRowndRequireSignInOptions
) => {
  return async (props: P) => {
    const cookieObj = await cookies();
    const rowndToken = cookieObj.get(ROWND_COOKIE_ID)?.value ?? null;
    const status = await getRowndAuthenticationStatus(rowndToken, options);

    if (!status.is_authenticated) {
      if (options?.onUnauthenticated && !status.is_expired) {
        options.onUnauthenticated();
      }
      return (
        <>
          <RequireSignIn isFallback={true} />
          <Fallback />
        </>
      );
    }

    const user: RowndAuthenticatedUser = {
        access_token: status.access_token,
        user_id: status.user_id,
    };

    const Component = WrappedComponent as unknown as React.ComponentType<P>;
    return (
      <>
        <Component {...props} user={user} />
        <RequireSignIn isFallback={false} />
      </>
    );
  };
};

export default withRowndRequireSignIn;
