import { describe, it, expect, vi } from 'vitest';
import { CLAIM_USER_ID, TokenHandler } from './token';
import { mockDeep } from 'vitest-mock-extended';
import createFetchMock from 'vitest-fetch-mock';
import * as jose from 'jose';
import crypto from 'node:crypto';

const fetchMock = createFetchMock(vi);
const mockJose = mockDeep<typeof jose>();

const testConfig = {
    supertokens: {
        appInfo: {
            apiDomain: 'https://supertokens.example.com',
            apiBasePath: '/auth',
        },
    },
};

async function generateJwk(): Promise<jose.JWK> {
    const jwk = await new Promise<JsonWebKey>((resolve, reject) => {
        crypto.generateKeyPair('ed25519', undefined, (e, _publicKey, privateKey) => {
          if (e) {
            reject(e);
          } else {
            resolve(
              (privateKey as crypto.KeyObject).export({
                format: 'jwk',
              }) as JsonWebKey
            );
          }
        });
      });

    return jwk as jose.JWK;
}

describe('TokenHandler', () => {

    describe('getKeystore', () => {
        it('should return the keystore', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            const jwk = await generateJwk();

            const fm = fetchMock.mockOnceIf(req => req.url === 'https://supertokens.example.com/auth/jwt/jwks.json', () => new Response(JSON.stringify({
                keys: [jwk],
            })));

            mockJose.createLocalJWKSet.mockResolvedValueOnce(
                jose.createLocalJWKSet({
                    keys: [jwk],
                })
            );

            fetchMock.enableMocks();
            const keystore = await tokenHandler.getKeystore(testConfig);
            fetchMock.dontMock();

            expect(fm).toHaveBeenCalled();
            expect(mockJose.createLocalJWKSet).toHaveBeenCalledWith({
                keys: [jwk],
            });
            expect(keystore).toBeDefined();

            const keystore2 = await tokenHandler.getKeystore(testConfig);
            expect(keystore2).toBe(keystore);
            expect(mockJose.createLocalJWKSet).toHaveBeenCalledOnce();
        });
    });

    describe('getRowndAuthenticationStatus', () => {
        it('should be unauthenticated when no cookie is present', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.determineAccessTokenFromCookie = vi.fn().mockReturnValueOnce(null);

            const status = await tokenHandler.getRowndAuthenticationStatus(null, testConfig);

            expect(status.is_authenticated).toBe(false);
            expect(status.user_id).toBeUndefined();
            expect(status.access_token).toBeUndefined();
            expect(status.is_expired).toBe(false);
        })

        it('should be unauthenticated when the cookie is invalid', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.determineAccessTokenFromCookie = vi.fn().mockReturnValueOnce('invalid');

            const status = await tokenHandler.getRowndAuthenticationStatus(null, testConfig);

            expect(status.is_authenticated).toBe(false);
            expect(status.user_id).toBeUndefined();
            expect(status.access_token).toBeUndefined();
            expect(status.is_expired).toBe(false);
        });

        it('should be authenticated when valid token is present in cookie', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.determineAccessTokenFromCookie = vi.fn().mockReturnValueOnce('valid_access_token');
            tokenHandler.validateAccessToken = vi.fn().mockResolvedValueOnce({
                payload: {
                    aud: ['app:123'],
                    [CLAIM_USER_ID]: 'user_123',
                },
                accessToken: 'valid_access_token',
            });

            const status = await tokenHandler.getRowndAuthenticationStatus(JSON.stringify({
                accessToken: 'valid_access_token',
            }), testConfig);

            expect(status.is_authenticated).toBe(true);
            expect(status.user_id).toBe('user_123');
            expect(status.access_token).toBe('valid_access_token');
            expect(status.is_expired).toBe(false);
            expect(status.err).toBeUndefined();
        });

        it('should be authenticated when expired token is present in cookie and allow_expired is true', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.determineAccessTokenFromCookie = vi.fn().mockReturnValueOnce('valid_access_token');
            tokenHandler.validateAccessToken = vi.fn().mockRejectedValueOnce(
                new jose.errors.JWTExpired('Token expired', {
                    aud: ['app:123'],
                    [CLAIM_USER_ID]: 'user_123',
                }, 'expired')
            );

            mockJose.decodeJwt.mockReturnValueOnce({
                aud: ['app:123'],
                [CLAIM_USER_ID]: 'user_123',
            });

            tokenHandler.getKeystore = vi.fn().mockResolvedValueOnce(
                mockJose.createLocalJWKSet({
                    keys: [await generateJwk()],
                })
            );

            const status = await tokenHandler.getRowndAuthenticationStatus(JSON.stringify({
                accessToken: 'valid_access_token',
            }), testConfig, { allowExpired: true });

            expect(status.is_authenticated).toBe(true);
            expect(status.user_id).toBe('user_123');
            expect(status.access_token).toBe('valid_access_token');
            expect(status.is_expired).toBe(true);
            expect(status.err).toBeUndefined();
        });

        it('should be unauthenticated when expired token is present in cookie and allowExpired is false', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.determineAccessTokenFromCookie = vi.fn().mockReturnValueOnce('valid_access_token');
            tokenHandler.validateAccessToken = vi.fn().mockRejectedValueOnce(
                new jose.errors.JWTExpired('Token expired', {
                    aud: ['app:123'],
                    [CLAIM_USER_ID]: 'user_123',
                }, 'expired')
            );

            mockJose.decodeJwt.mockReturnValueOnce({
                aud: ['app:123'],
                [CLAIM_USER_ID]: 'user_123',
            });

            tokenHandler.getKeystore = vi.fn().mockResolvedValueOnce(
                mockJose.createLocalJWKSet({
                    keys: [await generateJwk()],
                })
            );

            const status = await tokenHandler.getRowndAuthenticationStatus(JSON.stringify({
                accessToken: 'valid_access_token',
            }), testConfig, { allowExpired: false });

            expect(status.is_authenticated).toBe(false);
            expect(status.user_id).toBeUndefined();
            expect(status.access_token).toBeUndefined();
            expect(status.is_expired).toBe(true);
            expect(status.err).toBeInstanceOf(jose.errors.JWTExpired);
        });
    });

    describe('determineAccessTokenFromCookie', () => {
        it('should return the access token from the cookie', () => {
            const tokenHandler = new TokenHandler(mockJose);

            const accessToken = tokenHandler.determineAccessTokenFromCookie(JSON.stringify({
                accessToken: 'valid_access_token',
            }));

            expect(accessToken).toBe('valid_access_token');
        });
    });

    describe('getRowndUserData', () => {
        it('should return the user data from the access token', async () => {
            const tokenHandler = new TokenHandler(mockJose);

            tokenHandler.validateAccessToken = vi.fn().mockResolvedValueOnce({
                payload: {
                    aud: ['app:123'],
                    [CLAIM_USER_ID]: 'user_123',
                },
                accessToken: 'valid_access_token',
            });

            const fm = fetchMock.mockOnceIf(req => req.url === 'https://supertokens.example.com/auth/plugin/rownd/user', () => Promise.resolve(new Response(JSON.stringify({
                data: {
                    user_id: 'user_123',
                },
                redacted: [],
                verified_data: {},
                groups: [],
            }))));

            fetchMock.enableMocks();
            const userData = await tokenHandler.getRowndUserData('valid_access_token', testConfig);
            fetchMock.dontMock();

            expect(fm).toHaveBeenCalled();

            expect(userData).toEqual({
                data: {
                    user_id: 'user_123',
                },
                groups: [],
                redacted_fields: [],
                verified_data: {},
                meta: {},
                instant_user: undefined,
                is_loading: false,
            });
        });
    });
});
