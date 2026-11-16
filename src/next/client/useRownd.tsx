import { useStore } from './store/useStore';
import { store } from './store';
import { TRowndContext, UserDataContext } from '../../context/types';
import { useCallback, useMemo } from 'react';
import { signOutWithCookie } from './cookieSync';
import { addOnAuthenticatedListener, unsubscribeOnAuthenticatedListener } from '../../utils/listeners';

export const useRownd = (): TRowndContext => {
  const state = useStore(store, (x) => x);

  const onAuthenticated: (
    callback: (userData: UserDataContext) => void
  ) => () => void = useCallback(
    (callback: (userData: UserDataContext) => void) => {
      const id = addOnAuthenticatedListener(callback);

      const unsubscribe = () => {
        unsubscribeOnAuthenticatedListener(id);
      };

      return unsubscribe;
    },
    []
  );

  const memoized = useMemo(() => {
    return {
      ...state,
      onAuthenticated,
      signOut: () => signOutWithCookie(state.signOut),
    };
  }, [state, onAuthenticated]);

  return memoized;
};
