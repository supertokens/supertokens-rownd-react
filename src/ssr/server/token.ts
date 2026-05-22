import * as jose from 'jose';
import { rowndCookie, RowndCookieData } from './cookie';
import { UserContext } from '../../context/types';
import type { SuperTokensConfig } from '../../context/RowndContext';

export type RowndServerConfig = {
  supertokens: SuperTokensConfig;
};

export type RowndAuthenticatedUser = {
  user_id: string;
  access_token: string;
};

export type IsAuthenticatedResponse =
  | {
      user_id: string;
      access_token: string;
      is_authenticated: true;
      is_expired: boolean;
      err: undefined;
    }
  | {
      user_id: undefined;
      access_token: undefined;
      is_authenticated: false;
      is_expired: boolean;
      err: Error;
    };

export const CLAIM_USER_ID = 'https://auth.rownd.io/app_user_id';

export const getSuperTokensApiUrl = (config: RowndServerConfig): URL => {
  try {
    return new URL(config.supertokens.appInfo.apiDomain);
  } catch {
    throw new Error('Invalid supertokens.appInfo.apiDomain');
  }
};

export const getSuperTokensApiBasePath = (
  config: RowndServerConfig
): string => {
  const basePath = config.supertokens.appInfo.apiBasePath || '/auth';
  return basePath.startsWith('/') ? basePath : `/${basePath}`;
};

export const getSuperTokensApiBaseUrl = (config: RowndServerConfig): URL => {
  return new URL(
    getSuperTokensApiBasePath(config),
    getSuperTokensApiUrl(config).origin
  );
};

const KEYSTORE_CACHE_TTL = 1800; // 30 minutes
type Keystore = (
  protectedHeader?: jose.JWSHeaderParameters,
  token?: jose.FlattenedJWSInput
) => Promise<jose.KeyLike>;

export class TokenHandler {
  private keystoreCache = new Map<
    string,
    { keystore: Keystore; expiresAt: number }
  >();

  constructor(private readonly joseInstance: typeof jose = jose) {}

  async getKeystore(config: RowndServerConfig): Promise<Keystore> {
    const baseUrl = getSuperTokensApiBaseUrl(config);
    const cacheKey = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}`;
    const cachedKeystore = this.keystoreCache.get(cacheKey);

    if (cachedKeystore && cachedKeystore.expiresAt >= Date.now()) {
      return cachedKeystore.keystore;
    }

    const jwksRes = await fetch(`${cacheKey}/jwt/jwks.json`);
    const jwks = await jwksRes.json();

    const keystore = this.joseInstance.createLocalJWKSet(jwks);

    this.keystoreCache.set(cacheKey, {
      keystore,
      expiresAt: (Date.now() / 1000 + KEYSTORE_CACHE_TTL) * 1000,
    });

    return keystore;
  }

  async getRowndAuthenticationStatus(
    cookie: string | null,
    config: RowndServerConfig,
    { allowExpired = false }: { allowExpired?: boolean } = {}
  ): Promise<IsAuthenticatedResponse> {
    let unverifiedAccessToken: string | undefined;
    try {
      if (!cookie) {
        throw new Error('Cookie is null');
      }

      unverifiedAccessToken = this.determineAccessTokenFromCookie(cookie);

      if (!unverifiedAccessToken) {
        throw new Error('Cookie is missing access token');
      }

      const { payload, accessToken } = await this.validateAccessToken(
        unverifiedAccessToken,
        config
      );
      const userId = payload?.[CLAIM_USER_ID] as string | undefined;

      if (!userId) {
        throw new Error('Payload is missing user id claim');
      }

      return {
        user_id: userId,
        access_token: accessToken,
        is_authenticated: true,
        is_expired: false,
        err: undefined,
      };
    } catch (err) {
      let isExpired = false;

      if ((err as Error).name === 'JWTExpired') {
        isExpired = true;
      }

      if (isExpired && allowExpired && unverifiedAccessToken) {
        // At least make sure the token is properly signed
        await this.joseInstance.compactVerify(
          unverifiedAccessToken,
          await this.getKeystore(config)
        );

        const payload = this.joseInstance.decodeJwt(unverifiedAccessToken);

        return {
          user_id: payload?.[CLAIM_USER_ID] as string,
          access_token: unverifiedAccessToken,
          is_authenticated: true,
          is_expired: isExpired,
          err: undefined,
        };
      }

      // This likely indicates an issue with configuration,
      // so better to throw than to fail somewhat silently.
      if ((err as Error).name === 'JWKSNoMatchingKey') {
        throw new Error(
          (err as Error).message +
            '. Check the supertokens.appInfo.apiDomain server config.'
        );
      }

      return {
        is_authenticated: false,
        user_id: undefined,
        access_token: undefined,
        is_expired: isExpired,
        err: err as Error,
      };
    }
  }

  determineAccessTokenFromCookie(cookie: string): string | undefined {
    let cookieData: RowndCookieData | undefined;

    // First, try to parse as JSON
    try {
      const parsedCookie = JSON.parse(cookie);
      if (parsedCookie.accessToken) {
        cookieData = parsedCookie;
      }
    } catch {
      // Do nothing
    }

    // If that fails, try to parse as a cookie string
    if (!cookieData) {
      cookieData = rowndCookie.parse(cookie);
    }

    return cookieData?.accessToken;
  }

  async validateAccessToken(
    accessToken: string | undefined,
    config: RowndServerConfig
  ): Promise<{
    payload: jose.JWTPayload;
    accessToken: string;
  }> {
    if (!accessToken) {
      throw new Error('Cookie does not have accessToken');
    }

    const keystore = await this.getKeystore(config);

    return {
      payload: (await this.joseInstance.jwtVerify(accessToken, keystore))
        .payload,
      accessToken,
    };
  }

  async getRowndUserData(
    accessToken: string,
    config: RowndServerConfig
  ): Promise<null | UserContext> {
    await this.validateAccessToken(accessToken, config);

    let userData: Partial<UserContext> & { redacted?: string[] };

    try {
      const baseUrl = getSuperTokensApiBaseUrl(config);
      const userDataRes = await fetch(
        `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/plugin/rownd/user`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userDataRes.ok) {
        return null;
      }

      userData = await userDataRes.json();
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }

    return {
      data: userData.data || {},
      groups: userData.groups || [],
      redacted_fields: userData.redacted_fields || userData.redacted || [],
      verified_data: userData.verified_data || {},
      meta: userData.meta || {},
      instant_user: userData.instant_user,
      is_loading: Boolean(userData.is_loading),
    };
  }
}

// Default implementation
const defaultTokenHandler = new TokenHandler();

export const getRowndAuthenticationStatus =
  defaultTokenHandler.getRowndAuthenticationStatus.bind(defaultTokenHandler);
export const getRowndUserData =
  defaultTokenHandler.getRowndUserData.bind(defaultTokenHandler);
