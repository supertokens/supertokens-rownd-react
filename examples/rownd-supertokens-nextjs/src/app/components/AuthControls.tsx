'use client';

import { useEffect } from 'react';
import { useRownd } from '@supertokens/rownd-nextjs';

export default function AuthControls() {
  const {
    is_authenticated,
    is_initializing,
    onAuthenticated,
    requestSignIn,
    signOut,
    user,
  } = useRownd();

  useEffect(() => {
    const unsubscribe = onAuthenticated((userData) => {
      console.log('onAuthenticated', userData);
    });

    return () => unsubscribe();
  }, [onAuthenticated]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Auth controls</h2>
          <p className="mt-2 text-zinc-300">
            Status:{' '}
            {is_initializing
              ? 'initializing'
              : is_authenticated
                ? 'signed in'
                : 'signed out'}
          </p>
          {user.data.user_id ? (
            <p className="mt-1 font-mono text-sm text-zinc-400">
              {user.data.user_id}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => requestSignIn()}>Open Rownd UI</Button>
        <Button
          onClick={() =>
            requestSignIn({ method: 'email', post_login_redirect: '/profile' })
          }
        >
          Email
        </Button>
        <Button
          onClick={() =>
            requestSignIn({ method: 'google', post_login_redirect: '/profile' })
          }
        >
          Google
        </Button>
        <Button
          onClick={() =>
            requestSignIn({
              method: 'one_tap',
              method_options: { prompt_parent_id: 'google-one-tap-parent' },
              post_login_redirect: '/profile',
            })
          }
        >
          Google One Tap
        </Button>
        <Button
          onClick={() =>
            requestSignIn({
              method: 'anonymous',
              post_login_redirect: '/profile',
            })
          }
        >
          Continue as guest
        </Button>
        <Button variant="secondary" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
      <div id="google-one-tap-parent" className="mt-4 min-h-8" />
    </section>
  );
}

function Button({
  children,
  onClick,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const className =
    variant === 'primary'
      ? 'rounded-full bg-sky-400 px-4 py-2 font-medium text-zinc-950 hover:bg-sky-300'
      : 'rounded-full border border-white/15 px-4 py-2 font-medium text-white hover:bg-white/10';

  return (
    <button className={className} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
