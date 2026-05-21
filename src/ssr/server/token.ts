import * as jose from 'jose';
import { rowndCookie, RowndCookieData } from './cookie';
import { UserContext } from '../../context/types';

export type RowndAuthenticatedUser = {
  user_id: string;
  access_token: string;
}

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

export const getSuperTokensApiUrl = (): URL => {
  let url: URL;
  const defaultUrl = 'https://api.rownd.io';
  try {
    url = new URL(
      process.env.ROWND_SUPERTOKENS_API_DOMAIN ??
        process.env.ROWND_API_URL ??
        defaultUrl
    );
  } catch {
    url = new URL(defaultUrl);
  }
  return url;
}

export const getSuperTokensApiBasePath = (): string => {
  const basePath = process.env.ROWND_SUPERTOKENS_API_BASE_PATH || '/auth';
  return basePath.startsWith('/') ? basePath : `/${basePath}`;
}

export const getSuperTokensApiBaseUrl = (): URL => {
  return new URL(getSuperTokensApiBasePath(), getSuperTokensApiUrl().origin);
}

const KEYSTORE_CACHE_TTL = 1800; // 30 minutes
type Keystore = (
  protectedHeader?: jose.JWSHeaderParameters,
  token?: jose.FlattenedJWSInput
) => Promise<jose.KeyLike>;

export class TokenHandler {
  private keystoreCache: undefined | { keystore: Keystore; expiresAt: number };

  constructor(
    private readonly joseInstance: typeof jose = jose,
  ) {}

  async getKeystore(): Promise<Keystore> {

    if (this.keystoreCache && this.keystoreCache.expiresAt >= Date.now()) {
      return this.keystoreCache.keystore;
    }

    const jwksRes = await fetch(
      `${getSuperTokensApiBaseUrl().origin}${getSuperTokensApiBaseUrl().pathname.replace(/\/$/, '')}/jwt/jwks.json`
    );
    const jwks = await jwksRes.json();

    const keystore = this.joseInstance.createLocalJWKSet(jwks);

    this.keystoreCache = {
      keystore,
      expiresAt: (Date.now() / 1000 + KEYSTORE_CACHE_TTL) * 1000,
    };

    return keystore;
  }

  async getRowndAuthenticationStatus(
    cookie: string | null,
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

      const { payload, accessToken } = await this.validateAccessToken(unverifiedAccessToken);
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
        await this.joseInstance.compactVerify(unverifiedAccessToken, await this.getKeystore());

        const payload = this.joseInstance.decodeJwt(unverifiedAccessToken);

        return {
          user_id: payload?.[CLAIM_USER_ID] as string,
          access_token: unverifiedAccessToken,
          is_authenticated: true,
          is_expired: isExpired,
          err: undefined,
        }
      }

      // This likely indicates an issue with configuration,
      // so better to throw than to fail somewhat silently.
      if ((err as Error).name === 'JWKSNoMatchingKey') {
        throw new Error((err as Error).message + '. Do you need to update the ROWND_SUPERTOKENS_API_DOMAIN env var?');
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
    let cookieData: RowndCookieData | undefined

    // First, try to parse as JSON
    try {
      const parsedCookie = JSON.parse(cookie);
      if (parsedCookie.accessToken) {
        cookieData = parsedCookie
      }
    } catch {
      // Do nothing
    }

    // If that fails, try to parse as a cookie string
    if (!cookieData) {
      cookieData = rowndCookie.parse(cookie);
    }

    return cookieData?.accessToken
  }

  async validateAccessToken(
    accessToken?: string
  ): Promise<{
    payload: jose.JWTPayload;
    accessToken: string;
  }> {

    if (!accessToken) {
      throw new Error('Cookie does not have accessToken');
    }

    const keystore = await this.getKeystore();

    return {
      payload: (await this.joseInstance.jwtVerify(accessToken, keystore)).payload,
      accessToken,
    };
  }

  async getRowndUserData(accessToken: string): Promise<null | UserContext> {
    await this.validateAccessToken(accessToken);

    let userData: Partial<UserContext> & { redacted?: string[] };

    try {
      const baseUrl = getSuperTokensApiBaseUrl();
      const userDataRes = await fetch(`${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/plugin/rownd/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

export const getRowndAuthenticationStatus = defaultTokenHandler.getRowndAuthenticationStatus.bind(defaultTokenHandler);
export const getRowndUserData = defaultTokenHandler.getRowndUserData.bind(defaultTokenHandler);
