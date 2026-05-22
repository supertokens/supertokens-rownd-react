import { useCallback } from 'react';
import { clearCookie, setCookie } from '../server/cookie';
import { TRowndContext } from '../../context/types';

const useCookie = (useRownd: () => TRowndContext) => {
  const { getAccessToken } = useRownd();

  const cookieSignIn = useCallback(
    async (callback?: () => void) => {
      const token = await getAccessToken();
      if (!token) {
        return;
      }
      await setCookie(token);
      callback?.();
    },
    [getAccessToken]
  );

  const cookieSignOut = useCallback(async (callback?: () => void) => {
    try {
      await clearCookie();
      callback?.();
    } catch (err) {
      console.log('Failed to sign out cookie: ', err);
    }
  }, []);

  return { cookieSignIn, cookieSignOut };
};

export default useCookie;
