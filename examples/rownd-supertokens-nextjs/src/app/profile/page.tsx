import Link from 'next/link';
import { cookies } from 'next/headers';
import { RowndServerStateSync } from '@rownd/next';
import { getRowndAccessToken, getRowndUser, getRowndUserId, isAuthenticated } from '@rownd/next/server';

export default async function ProfilePage() {
  const [authenticated, userId, accessToken, user] = await Promise.all([
    isAuthenticated(cookies),
    getRowndUserId(cookies),
    getRowndAccessToken(cookies),
    getRowndUser(cookies),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <RowndServerStateSync />
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300">Server-rendered profile</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">SSR auth state</h1>
        <p className="mt-4 text-zinc-300">
          This page uses <code>@rownd/next/server</code> helpers to validate the SuperTokens access token and load the
          Rownd-compatible user profile from the plugin endpoint.
        </p>
        <Link className="mt-6 inline-flex rounded-full bg-white px-4 py-2 font-medium text-zinc-950" href="/">
          Back home
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Authenticated" value={String(authenticated)} />
        <StatusCard label="User ID" value={userId || 'none'} />
        <StatusCard label="Access token" value={accessToken ? 'present' : 'none'} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
        <h2 className="text-xl font-semibold">User data</h2>
        <pre className="mt-4 rounded-2xl bg-black/40 p-4 text-sm text-zinc-200">{JSON.stringify(user, null, 2)}</pre>
      </section>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 font-mono text-sm text-white">{value}</p>
    </div>
  );
}
