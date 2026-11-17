import { clearCookie, setCookie } from '../../ssr/server/cookie';
import { TRowndContext } from '../../context/types';
import { getOnAuthenticatedListeners } from '../../utils/listeners';
import { store } from './store/index';

const consumers = new Map<object, { reloadOnChange: boolean; isFallback?: boolean }>();
let unsubscribe: (() => void) | undefined;
let previous: TRowndContext | undefined;
let generation = 0;
let authenticatedUser: string | undefined;
let signOutOperation: Promise<void> | undefined;
let awaitingSignedOutState = false;
let lastCookieSync: { generation: number; state: TRowndContext; promise: Promise<boolean> } | undefined;
let reloadGeneration = -1;
let pageIdentity: string | undefined;

function getIdentity(state: TRowndContext): string | undefined {
  if (!state.access_token || !state.is_authenticated) return undefined;
  try {
    // The new token can precede its profile. Prefer token identity over stale user data.
    const payload = state.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(payload));
    const userId = claims['https://auth.rownd.io/app_user_id'];
    if (typeof userId === 'string' && userId) return userId;
    const { sub } = claims;
    if (typeof sub === 'string' && sub) return sub;
  } catch {
    // Older Hub tokens may not expose a JWT subject.
  }
  return state.user.data.user_id;
}

function identityChanged(state: TRowndContext): boolean {
  const identity = getIdentity(state);
  return Boolean(pageIdentity && identity && pageIdentity !== identity);
}

function needsFallbackReload(state: TRowndContext): boolean {
  return Array.from(consumers.values()).some(({ isFallback }) =>
    isFallback !== undefined && (isFallback === Boolean(state.access_token) ||
      (!isFallback && identityChanged(state))));
}

function canComplete(state: TRowndContext, current: number): boolean {
  const latest = store.getState();
  return current === generation && !signOutOperation && !awaitingSignedOutState &&
    !latest.is_signing_out && !latest.is_initializing &&
    latest.access_token === state.access_token &&
    latest.is_authenticated === state.is_authenticated &&
    latest.user.data.user_id === state.user.data.user_id;
}

function maybeReload(state: TRowndContext, current: number, transition = false) {
  if (!canComplete(state, current) || reloadGeneration === current) return;
  if (state.access_token && !state.is_authenticated) return;
  const identityReload = identityChanged(state) &&
    Array.from(consumers.values()).some(x => x.reloadOnChange);
  if (transition || identityReload || needsFallbackReload(state)) {
    reloadGeneration = current;
    pageIdentity = getIdentity(state);
    window.location.reload();
  }
}

function sync(state: TRowndContext) {
  const prev = previous;
  previous = state;
  if (awaitingSignedOutState) {
    if (!state.access_token && !state.is_signing_out) awaitingSignedOutState = false;
    return;
  }
  if (state.is_signing_out || signOutOperation) {
    generation++;
    authenticatedUser = undefined;
    return;
  }
  if (state.is_initializing) return;
  // Keep the page's identity until reload; profile-only updates must not erase a pending switch.
  if (!pageIdentity) pageIdentity = getIdentity(state);
  if (prev && !prev.is_initializing && !prev.is_signing_out &&
      prev.access_token === state.access_token &&
      prev.is_authenticated === state.is_authenticated &&
      prev.user.data.user_id === state.user.data.user_id) return;

  const current = ++generation;
  const reload = Array.from(consumers.values()).some(x => x.reloadOnChange) && prev &&
    !prev.is_initializing && !prev.is_signing_out &&
    Boolean(prev.access_token) !== Boolean(state.access_token);

  if (!state.access_token) {
    authenticatedUser = undefined;
    if (prev && !prev.is_initializing && !prev.access_token &&
        !prev.is_signing_out && !needsFallbackReload(state)) return;
    const promise = clearCookie().then(() => true).catch(error => {
      console.error('Failed to clear sign out cookie: ', error);
      return false;
    });
    lastCookieSync = { state, generation: current, promise };
    void promise.then(success => {
      if (success) maybeReload(state, current, Boolean(reload));
    });
    return;
  }

  const promise = setCookie(state.access_token).then(Boolean);
  lastCookieSync = { state, generation: current, promise };
  void promise.then(success => {
    if (!success || !canComplete(state, current)) return;
    const latest = store.getState();
    if (latest.is_initializing || !latest.is_authenticated ||
        latest.access_token !== state.access_token ||
        latest.user.data.user_id !== state.user.data.user_id) return;
    const userId = state.user.data.user_id;
    if (userId && authenticatedUser !== userId) {
      authenticatedUser = userId;
      getOnAuthenticatedListeners().forEach(({ callback }) => callback(state.user.data));
    }
    maybeReload(state, current, Boolean(reload));
  });
}

// Next consumers share a single store subscription and cookie writer.
export function subscribeCookieSync(reloadOnChange = false, isFallback?: boolean, renderedUserId?: string): () => void {
  const consumer = {};
  consumers.set(consumer, { reloadOnChange, isFallback });
  if (isFallback === false && renderedUserId) pageIdentity = renderedUserId;
  if (!unsubscribe) {
    unsubscribe = store.subscribe(sync);
    sync(store.getState());
  } else if (isFallback !== undefined) {
    const pending = lastCookieSync;
    if (pending && pending.generation === generation) {
      void pending.promise.then(success => {
        if (success) maybeReload(pending.state, pending.generation);
      });
    } else {
      previous = undefined;
      sync(store.getState());
    }
  }
  return () => {
    consumers.delete(consumer);
    if (!consumers.size) {
      unsubscribe?.();
      unsubscribe = undefined;
      previous = undefined;
      authenticatedUser = undefined;
      awaitingSignedOutState = false;
      lastCookieSync = undefined;
      pageIdentity = undefined;
      generation++;
    }
  };
}

export function signOutWithCookie(signOut: () => Promise<void>): Promise<void> {
  if (signOutOperation) return signOutOperation;
  generation++;
  authenticatedUser = undefined;
  let succeeded = false;
  // Defer execution so listeners see the operation guard before any cookie/Hub work.
  signOutOperation = Promise.resolve().then(async () => {
    await setCookie('invalid');
    try {
      await signOut();
      succeeded = true;
    } finally {
      try {
        await clearCookie();
      } catch (error) {
        console.error('Failed to clear sign out cookie: ', error);
      }
    }
  }).finally(() => {
    signOutOperation = undefined;
    if (succeeded) {
      const state = store.getState();
      // Hub completion can precede the React listener's terminal store update.
      awaitingSignedOutState = Boolean(state.access_token || state.is_signing_out);
    } else {
      previous = undefined;
      sync(store.getState());
    }
  });
  return signOutOperation;
}
