import React, { useContext, createContext } from 'react';
import { TRowndContext } from './types';

export const RowndContext = createContext<TRowndContext | undefined>(undefined);

export type HubListenerProps = {
  state: any;
  api: any;
};

export type SuperTokensConfig = {
  appInfo: {
    appName?: string;
    apiDomain: string;
    apiBasePath?: string;
  };
};

export type RowndProviderProps = {
  /** Rownd app key used to load the correct Hub app config. */
  appKey: string;

  /** SuperTokens frontend config the Hub uses for session creation and refresh. */
  supertokens: SuperTokensConfig;

  /** Root origin used by the Hub when coordinating state across domains. */
  rootOrigin?: string;

  /** Hub script base URL override, usually for staging or local Hub development. */
  hubUrlOverride?: string;

  /** Client-domain key used by the Rownd plugin to choose magic-link and verification-link base URLs. */
  clientDomain?: string;

  /** Default URL or path users return to after sign-in, magic-link completion, or email verification. */
  postLoginRedirect?: string;

  /** URL or path newly registered users return to when registration should redirect differently from sign-in. */
  postRegistrationUrl?: string;

  /** URL or path users are sent to after sign-out. */
  postSignOutRedirect?: string;

  /**
   * API version date string (e.g., '2026-01-21') that controls which Hub features are enabled.
   * Defaults to the current SDK version date for new features.
   * Set to an earlier date to opt-out of newer behaviors.
   */
  apiVersion?: string;

  /** React children rendered inside the Rownd provider. */
  children: React.ReactNode;
};

function useRownd(): TRowndContext {
  const context = useContext(RowndContext);

  if (context === undefined) {
    throw new Error('useRownd must be used within a RowndProvider');
  }

  return context;
}

export { useRownd };
