"use client";

import Link from "next/link";
import { useState } from "react";
import { useTournament } from "@/lib/store";

export default function AdminPage() {
  const { isAdmin, login, logout } = useTournament();
  const [token, setToken] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await login(token);
    setBusy(false);
    setError(!ok);
    if (ok) setToken("");
  }

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
        <div className="rounded-md border border-slate-700 bg-slate-800 p-6">
          <p className="mb-4 text-[13px] text-slate-300">
            ✅ Je bent ingelogd. Wijzigingen worden direct opgeslagen in de database
            (commit op de repo) en staan na ±1 minuut op de site.
          </p>
          <ul className="mb-5 space-y-1.5 text-[13px] text-slate-400">
            <li>• <Link href="/tournaments" className="text-lime-400 hover:underline">Tournaments</Link> — deelnemers, scores, bracket-grootte, spellen toevoegen</li>
            <li>• <Link href="/schedule" className="text-lime-400 hover:underline">Schedule</Link> — datum/tijd en duur per toernooi</li>
            <li>• <Link href="/seatplan" className="text-lime-400 hover:underline">Seatplan</Link> — stoelen indelen en vrijgeven</li>
            <li>• <Link href="/" className="text-lime-400 hover:underline">Home</Link> — startmoment van de LAN (countdown)</li>
          </ul>
          <button
            onClick={logout}
            className="cursor-pointer rounded border border-lime-400 px-4 py-2 text-xs font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
          >
            Uitloggen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Log in met de beheer-token van de organisatie. Die blijft in je browser
        en wordt nergens anders opgeslagen.
      </p>
      <div className="w-full rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-7">
        {error && <p className="mb-2.5 text-[11px] text-red-500">Token werkt niet — check de rechten (Contents: read &amp; write op de repo).</p>}
        <input
          type="password"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          placeholder="GitHub fine-grained token"
          className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
        />
        <button
          onClick={() => void submit()}
          disabled={busy || !token.trim()}
          className="w-full cursor-pointer rounded bg-lime-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
        >
          {busy ? "Bezig…" : "Inloggen"}
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          Token maken: GitHub → Settings → Developer settings → Fine-grained tokens,
          alleen toegang tot <code className="text-slate-400">xrlp.github.io</code> met
          permissie <code className="text-slate-400">Contents: read &amp; write</code>.
        </p>
      </div>
    </div>
  );
}
