import React from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Client from '../index';
import { store } from '../store/index';
import { useRownd } from '../useRownd';
import RowndServerStateSync from './RowndServerStateSync';
import useHub from '../../../hooks/useHub';
import RequireSignIn from './RequireSignIn';

vi.mock('../../../context/HubScriptInjector/HubScriptInjector', () => ({ default: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

describe('shared Next cookie synchronization with real hooks', () => {
  const reload = vi.fn();
  const requests: { body: { accessToken?: string; clear?: boolean }; response: ReturnType<typeof deferred<Response>> }[] = [];

  beforeEach(() => {
    requests.length = 0;
    reload.mockClear();
    Object.defineProperty(window, 'location', { value: { reload }, writable: true });
    vi.stubGlobal('fetch', vi.fn((_url, init) => {
      const response = deferred<Response>();
      requests.push({ body: JSON.parse(init.body), response });
      return response.promise;
    }));
    store.setState({ is_initializing: true, is_signing_out: false, access_token: null });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function mount() {
    render(<><Client appKey="test" supertokens={{ appInfo: { apiDomain: 'https://example.com' } }} /><RowndServerStateSync /></>);
    return renderHook(() => useRownd()).result;
  }

  function publish(token: string | null, isSigningOut = false) {
    act(() => store.setState({
      access_token: token,
      is_authenticated: Boolean(token),
      is_initializing: false,
      is_signing_out: isSigningOut,
      user: { ...store.getState().user, data: { user_id: 'user-1' } },
    }));
  }

  async function complete(index: number, status = 200) {
    requests[index].response.resolve(new Response('ok', { status }));
    await flush();
  }

  it('deduplicates both consumers; refresh writes silently and normal sign-out reloads after clear', async () => {
    mount();
    publish('initial');
    await flush();
    expect(requests.map(x => x.body)).toEqual([{ accessToken: 'initial' }]);
    await complete(0);
    expect(reload).not.toHaveBeenCalled();
    publish('refreshed');
    await flush();
    expect(requests).toHaveLength(2);
    await complete(1);
    expect(reload).not.toHaveBeenCalled();
    publish(null);
    await flush();
    expect(requests[2].body).toEqual({ clear: true });
    expect(reload).not.toHaveBeenCalled();
    await complete(2);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('awaits Hub and final serialized cookie with older/new Hub flag=%s', async flag => {
    const result = mount();
    const authenticated = vi.fn();
    const unsubscribe = result.current.onAuthenticated(authenticated);
    const hub = deferred<void>();
    const signOut = vi.fn(() => hub.promise);
    act(() => store.setState({ signOut }));
    publish('initial');
    await flush();
    let settled = false;
    const operation = result.current.signOut();
    operation.then(() => { settled = true; });
    expect(result.current.signOut()).toBe(operation);
    await flush();
    expect(requests).toHaveLength(1);
    expect(signOut).not.toHaveBeenCalled();
    publish('refreshed-during-signout', flag);
    await complete(0);
    expect(authenticated).not.toHaveBeenCalled();
    expect(requests[1].body).toEqual({ accessToken: 'invalid' });
    await complete(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    publish(null, flag);
    hub.resolve();
    await flush();
    expect(requests.map(x => x.body)).toEqual([
      { accessToken: 'initial' }, { accessToken: 'invalid' }, { clear: true },
    ]);
    expect(settled).toBe(false);
    publish(null, false);
    await complete(2);
    await operation;
    expect(settled).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(authenticated).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('propagates Hub rejection only after final cookie cleanup', async () => {
    const result = mount();
    const hub = deferred<void>();
    act(() => store.setState({ signOut: () => hub.promise }));
    const error = new Error('Hub failure');
    const operation = result.current.signOut();
    const rejected = expect(operation).rejects.toBe(error);
    await flush();
    await complete(0);
    hub.reject(error);
    await flush();
    expect(requests[1].body).toEqual({ clear: true });
    await complete(1);
    await rejected;
  });

  it('continues after cookie HTTP failure and awaits best-effort final clear', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = mount();
    const signOut = vi.fn(async () => {});
    act(() => store.setState({ signOut }));
    const operation = result.current.signOut();
    await flush();
    await complete(0, 500);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(requests[1].body).toEqual({ clear: true });
    await complete(1, 500);
    await expect(operation).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it('suppresses external Hub progress effects and stale in-flight callbacks', async () => {
    const result = mount();
    const authenticated = vi.fn();
    const unsubscribe = result.current.onAuthenticated(authenticated);
    publish('initial');
    await flush();
    publish('refresh', true);
    await complete(0);
    expect(requests).toHaveLength(1);
    expect(authenticated).not.toHaveBeenCalled();
    publish(null, true);
    await flush();
    expect(requests).toHaveLength(1);
    publish(null, false);
    await flush();
    // A completed external Hub sign-out still needs a final cookie clear.
    expect(requests[1]?.body).toEqual({ clear: true });
    await complete(1);
    expect(reload).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('requires current authenticated state, including status-only transitions', async () => {
    const result = mount();
    const authenticated = vi.fn();
    const unsubscribe = result.current.onAuthenticated(authenticated);
    publish('token');
    act(() => store.setState({ is_authenticated: false }));
    await flush();
    await complete(0);
    await complete(1);
    expect(authenticated).not.toHaveBeenCalled();
    act(() => store.setState({ is_authenticated: true }));
    await flush();
    await complete(2);
    expect(authenticated).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('suppresses a terminal Hub update arriving after the sign-out promise settles', async () => {
    const result = mount();
    act(() => store.setState({ signOut: async () => {} }));
    publish('initial');
    await flush();
    await complete(0);
    const operation = result.current.signOut();
    await flush();
    await complete(1);
    await complete(2);
    await operation;
    publish('late-refresh', true);
    publish(null, false);
    await flush();
    expect(requests).toHaveLength(3);
    expect(reload).not.toHaveBeenCalled();
  });

  it('resynchronizes the current authenticated cookie after a failed sign-out', async () => {
    const result = mount();
    const error = new Error('sign-out failed');
    act(() => store.setState({ signOut: async () => { throw error; } }));
    publish('still-authenticated');
    await flush();
    await complete(0);
    const operation = result.current.signOut();
    const rejected = expect(operation).rejects.toBe(error);
    await flush();
    await complete(1);
    await complete(2);
    await rejected;
    expect(requests[3].body).toEqual({ accessToken: 'still-authenticated' });
    await complete(3);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not authenticate an expired-token projection; authenticates after valid refresh', async () => {
    const result = mount();
    const adapter = renderHook(() => useHub()).result;
    const authenticated = vi.fn();
    const unsubscribe = result.current.onAuthenticated(authenticated);
    const jwt = (exp: number) => `e30.${btoa(JSON.stringify({ exp }))}.signature`;
    const project = (token: string) => act(() => adapter.current.hubListenerCb({
      state: { is_initializing: false, auth: { access_token: token }, user: { ...store.getState().user, data: { user_id: 'user-1' } } },
      api: {}, callback: update => store.setState(update),
    }));
    project(jwt(Math.floor(Date.now() / 1000) - 60));
    await flush();
    await complete(0);
    expect(result.current.is_authenticated).toBe(false);
    expect(result.current.auth.is_authenticated).toBe(false);
    expect(authenticated).not.toHaveBeenCalled();
    project(jwt(Math.floor(Date.now() / 1000) + 600));
    await flush();
    await complete(1);
    expect(result.current.is_authenticated).toBe(true);
    expect(authenticated).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('RequireSignIn shares the cookie write and cannot retrieve/rewrite a stale token across sign-out', async () => {
    const result = mount();
    const tokenRetrieval = deferred<string>();
    const getAccessToken = vi.fn(() => tokenRetrieval.promise);
    const hub = deferred<void>();
    act(() => store.setState({ getAccessToken, signOut: () => hub.promise }));
    publish('initial');
    await flush();
    render(<RequireSignIn isFallback />);
    await flush();
    expect(requests).toHaveLength(1);
    const operation = result.current.signOut();
    tokenRetrieval.resolve('stale-token');
    await complete(0);
    await complete(1);
    publish(null, true);
    hub.resolve();
    await flush();
    publish(null, false);
    await complete(2);
    await operation;
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(requests.map(x => x.body)).toEqual([
      { accessToken: 'initial' }, { accessToken: 'invalid' }, { clear: true },
    ]);
    expect(reload).not.toHaveBeenCalled();
  });

  it.each([true, false])('RequireSignIn reloads after correcting server fallback=%s mismatch', async isFallback => {
    mount();
    publish(isFallback ? 'signed-in' : null);
    await flush();
    render(<RequireSignIn isFallback={isFallback} />);
    await flush();
    expect(requests).toHaveLength(1);
    expect(requests[0].body).toEqual(isFallback ? { accessToken: 'signed-in' } : { clear: true });
    expect(reload).not.toHaveBeenCalled();
    await complete(0);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
