import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HubScriptInjector from './HubScriptInjector';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Hub API version configuration', () => {
  it.each([undefined, '2026-01-21'])('defaults to release date without overriding explicit apiVersion=%s', apiVersion => {
    window._rphConfig = [];
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node.nodeName === 'SCRIPT' ? node : append(node));
    renderHook(() => HubScriptInjector({
      appKey: 'test', apiVersion, stateListener: () => {},
      supertokens: { appInfo: { apiDomain: 'https://example.com' } },
    }));
    expect(window._rphConfig).toContainEqual(['setApiVersion', apiVersion ?? '2026-11-16']);
  });
});
