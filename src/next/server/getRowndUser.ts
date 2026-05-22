import {
  getRowndAuthenticationStatus,
  getRowndUserData,
} from '../../ssr/server/token';
import type { RowndServerConfig } from '../../ssr/server/token';
import { ROWND_COOKIE_ID } from '../../ssr/server/cookie';
import { UserContext } from '../../context/types';

export type RequestCookiesFn =
  () => Promise<ReadOnlyRequestCookies> | ReadOnlyRequestCookies;

export type ReadOnlyRequestCookies = {
  get: (name: string) => RequestCookie | undefined;
};

export type RequestCookie = {
  name: string;
  value: string;
};

export const getRowndUser =
  async (cookies: RequestCookiesFn, config: RowndServerConfig): Promise<UserContext | null> => {
    const cookieObj = await cookies();
    const rowndToken = cookieObj.get(ROWND_COOKIE_ID)?.value ?? null;
    const status = await getRowndAuthenticationStatus(rowndToken, config, { allowExpired: false });

    if (!status.access_token) {
      return null;
    }

    const userData = await getRowndUserData(status.access_token, config);
    return userData;
  };
