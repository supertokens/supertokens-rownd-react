'use client';

import { useState } from 'react';

const backendPort = process.env.NEXT_PUBLIC_EXAMPLE_BACKEND_PORT || '3137';
const backendOrigin = `http://localhost:${backendPort}`;

export default function ProtectedResource() {
  const [result, setResult] = useState<unknown>('Not requested');

  async function fetchProtected() {
    try {
      const response = await fetch(`${backendOrigin}/test/protected`, { credentials: 'include' });
      const body = await response.json().catch(() => null);
      setResult({ status: response.status, body });
    } catch (error) {
      setResult({ error: String(error) });
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Backend protected route</h2>
          <p className="mt-2 text-zinc-300">Calls SuperTokens `verifySession()` on the local backend.</p>
        </div>
        <button className="rounded-full bg-white px-4 py-2 font-medium text-zinc-950" type="button" onClick={fetchProtected}>
          Fetch protected resource
        </button>
      </div>
      <pre className="mt-4 rounded-2xl bg-black/40 p-4 text-sm text-zinc-200">{JSON.stringify(result, null, 2)}</pre>
    </section>
  );
}
