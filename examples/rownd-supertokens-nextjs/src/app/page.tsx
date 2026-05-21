import Link from 'next/link';
import AuthControls from './components/AuthControls';
import ProtectedResource from './components/ProtectedResource';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-300">Next.js App Router</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Rownd APIs backed by SuperTokens</h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          This standalone example uses <code>@rownd/next</code>, the deployed Hub bundle, and a local SuperTokens
          backend with the Rownd plugin.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="rounded-full bg-white px-4 py-2 font-medium text-zinc-950" href="/profile">
            Open SSR profile
          </Link>
          <a className="rounded-full border border-white/15 px-4 py-2 font-medium text-white" href="http://localhost:3137/health">
            Backend health
          </a>
        </div>
      </section>

      <AuthControls />
      <ProtectedResource />
    </main>
  );
}
