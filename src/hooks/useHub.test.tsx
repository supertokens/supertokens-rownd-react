import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import useHub from './useHub';
import { TRowndContext } from '../context/types';

afterEach(cleanup);

describe('Hub sign-out adapter', () => {
  it.each([false, true])('settles pre-ready queued sign-out, rejection=%s', async reject => {
    const { result } = renderHook(() => useHub());
    let resolve!: () => void;
    let fail!: (error: Error) => void;
    const hub = new Promise<void>((a, b) => { resolve = a; fail = b; });
    const operation = result.current.setInitialHubState().signOut();
    let settled = false;
    void operation.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    act(() => result.current.hubListenerCb({ state: { auth: {}, user: {} }, api: { signOut: () => hub }, callback: () => {} }));
    await Promise.resolve();
    expect(settled).toBe(false);
    if (reject) {
      const error = new Error('Hub failure');
      fail(error);
      await expect(operation).rejects.toBe(error);
    } else {
      resolve();
      await expect(operation).resolves.toBeUndefined();
    }
  });

  it('projects canonical top-level flag and defaults absent older-Hub flag to false', () => {
    const { result } = renderHook(() => useHub());
    let context: TRowndContext = { ...result.current.setInitialHubState(), onAuthenticated: () => () => {} };
    expect(context.is_signing_out).toBe(false);
    for (const flag of [true, false, undefined]) {
      act(() => result.current.hubListenerCb({
        state: { auth: {}, user: {}, is_signing_out: flag }, api: {},
        callback: update => { context = update(context); },
      }));
      expect(context.is_signing_out).toBe(Boolean(flag));
    }
  });

  it('turns synchronous ready-Hub errors into rejected promises', async () => {
    const { result } = renderHook(() => useHub());
    const error = new Error('synchronous error');
    act(() => result.current.hubListenerCb({ state: { auth: {}, user: {} }, api: { signOut: () => { throw error; } }, callback: () => {} }));
    await expect(result.current.setInitialHubState().signOut()).rejects.toBe(error);
  });

  it('honors authoritative Hub auth and uses expiry-aware older-Hub fallback through refresh', () => {
    const { result } = renderHook(() => useHub());
    let context: TRowndContext = { ...result.current.setInitialHubState(), onAuthenticated: () => () => {} };
    const jwt = (exp: number) => `e30.${btoa(JSON.stringify({ exp }))}.signature`;
    const expired = jwt(Math.floor(Date.now() / 1000) - 60);
    const fresh = jwt(Math.floor(Date.now() / 1000) + 600);
    const project = (token: string, api: object) => {
      act(() => result.current.hubListenerCb({
        state: { is_initializing: false, auth: { access_token: token }, user: {} }, api,
        callback: update => { context = update(context); },
      }));
      return [context.is_authenticated, context.auth.is_authenticated];
    };
    expect(project(expired, { isAuthenticated: () => false })).toEqual([false, false]);
    expect(project(fresh, { isAuthenticated: () => false })).toEqual([false, false]);
    expect(project(fresh, { isAuthenticated: () => true })).toEqual([true, true]);
    expect(project(expired, {})).toEqual([false, false]);
    expect(project(fresh, {})).toEqual([true, true]);
    expect(project('malformed', {})).toEqual([false, false]);
    expect(project(`e30.${btoa('{}')}.signature`, {})).toEqual([false, false]);
  });
});
