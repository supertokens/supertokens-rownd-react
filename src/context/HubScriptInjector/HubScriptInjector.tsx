import { useEffect } from 'react';
import { HubListenerProps, SuperTokensConfig } from '../RowndContext';

declare global {
  interface Window {
    _rphConfig: any;
  }
}

function setConfigValue(key: string, value: any) {
  if (!value) {
    return;
  }

  window?._rphConfig.push([key, value]);
}

/**
 * Default API version for new SDK releases.
 * This controls which Hub features are enabled by default.
 */
const DEFAULT_API_VERSION = '2026-01-21';

export type HubScriptInjectorProps = {
  appKey: string;
  stateListener: ({ state, api }: HubListenerProps) => void;
  supertokens: SuperTokensConfig;
  hubUrlOverride?: string;
  locationHash?: string;
  clientDomain?: string;
  postLoginRedirect?: string;
  apiVersion?: string;
};

// Grab the URL hash ASAP in case it contains an `rph_init` param
const locationHash =
  typeof window !== 'undefined' ? window?.location?.hash : void 0;

export default function HubScriptInjector({
  appKey,
  supertokens,
  hubUrlOverride,
  stateListener,
  apiVersion = DEFAULT_API_VERSION,
  ...rest
}: HubScriptInjectorProps) {
  useEffect(() => {
    if (!window) {
      return; // compat with server-side rendering
    }

    const _rphConfig = (window._rphConfig = window._rphConfig || []);
    const baseUrl =
      window.localStorage.getItem('rph_base_url_override') ||
      hubUrlOverride ||
      'https://rownd-hub.supertokens.com';
    _rphConfig.push(['setBaseUrl', baseUrl]);

    setConfigValue('setAppKey', appKey);
    setConfigValue('setStateListener', stateListener);
    setConfigValue('setLocationHash', locationHash);
    setConfigValue('setApiVersion', apiVersion);
    setConfigValue('setSupertokens', supertokens);

    const d = document,
      g = d.createElement('script'),
      m = d.createElement('script'),
      s = d.getElementsByTagName('script')[0];
    g.noModule = true;
    g.async = true;
    g.src = baseUrl + '/static/scripts/rph.js';
    m.type = 'module';
    m.async = true;
    m.src = baseUrl + '/static/scripts/rph.mjs';

    if (s?.parentNode) {
      s.parentNode.insertBefore(g, s);
      s.parentNode.insertBefore(m, s);
    } else {
      d.body.appendChild(g);
      d.body.appendChild(m);
    }

    if (window.localStorage.getItem('rph_log_level') === 'debug') {
      console.debug('[debug] rest:', rest);
    }

    if (rest) {
      Object.entries(rest).forEach(([key, value]) => {
        setConfigValue(
          `set${key.charAt(0).toUpperCase() + key.substring(1)}`,
          value
        );
      });

      if (window.localStorage.getItem('rph_log_level') === 'debug') {
        console.debug('[debug] hubConfig:', window._rphConfig);
      }
    }
  }, [
    appKey,
    supertokens,
    stateListener,
    locationHash,
    hubUrlOverride,
    apiVersion,
    rest,
  ]);

  return null;
}
