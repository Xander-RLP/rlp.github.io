"use client";

import Link from "next/link";
import { useState } from "react";
import { useTournament } from "@/lib/store";

export default function AdminPage() {
  const { staticMode, isAdmin, remoteAdmin, login, loginGitHub, logout } = useTournament();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ghToken, setGhToken] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitLocal() {
    setBusy(true);
    const ok = await login(username, password);
    setBusy(false);
    setError(!ok);
  }

  async function submitGitHub() {
    setBusy(true);
    const ok = await loginGitHub(ghToken.trim());
    setBusy(false);
    setError(!ok);
    if (ok) setGhToken("");
  }

  if (isAdmin) {
    return (
      <div>
        <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
        <div className="max-w-xl rounded-md border border-slate-700 bg-slate-800 p-6">
          <p className="mb-4 text-[13px] text-slate-300">
            ✅ Je bent ingelogd{remoteAdmin ? " via GitHub — wijzigingen worden als commit opgeslagen en staan na ±1 minuut live" : " op de lokale server"}. Je kunt nu overal bewerken:
          </p>
          <ul className="mb-5 space-y-1.5 text-[13px] text-slate-400">
            <li>• <Link href="/" className="text-lime-400 hover:underline">Brackets</Link> — deelnemers, scores, bracket-grootte, spellen toevoegen</li>
            <li>• <Link href="/schedule" className="text-lime-400 hover:underline">Schedule</Link> — datum/tijd per toernooi (agenda)</li>
            <li>• <Link href="/seatplan" className="text-lime-400 hover:underline">Seatplan</Link> — stoelen indelen en vrijgeven</li>
          </ul>
          {remoteAdmin && (
            <p className="mb-5 text-xs text-slate-500">
              Het automatisch zoeken van spel-plaatjes werkt alleen lokaal (via server.py).
            </p>
          )}
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

  if (staticMode) {
    return (
      <div>
        <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
        <p className="mb-5 max-w-xl text-[13px] text-slate-400">
          Beheer de site vanaf hier met een GitHub-token: wijzigingen worden als commit
          op de repo opgeslagen en staan na ±1 minuut live.
        </p>
        <div className="w-96 max-w-full rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-7">
          {error && <p className="mb-2.5 text-[11px] text-red-500">Token werkt niet — check de rechten (Contents: read &amp; write op de repo).</p>}
          <input
            type="password"
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void submitGitHub(); }}
            placeholder="GitHub fine-grained token"
            className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
          />
          <button
            onClick={() => void submitGitHub()}
            disabled={busy || !ghToken.trim()}
            className="w-full cursor-pointer rounded bg-lime-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
          >
            {busy ? "Bezig…" : "Inloggen met GitHub-token"}
          </button>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Maak een token op GitHub → Settings → Developer settings → Fine-grained tokens,
            met alleen toegang tot <code className="text-slate-400">xrlp.github.io</code> en
            permissie <code className="text-slate-400">Contents: read &amp; write</code>.
            De token blijft in je browser en wordt nergens anders opgeslagen.
          </p>
        </div>
        <p className="mt-4 max-w-xl text-xs text-slate-500">
          Op de LAN zelf kun je ook lokaal beheren: <code>python3 server.py</code> + <code>npm run dev</code>, inloggen op /admin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
      <p className="mb-5 text-[13px] text-slate-400">Log in om de site te beheren.</p>
      <div className="w-80 rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-7">
        {error && <p className="mb-2.5 text-[11px] text-red-500">Ongeldige inloggegevens.</p>}
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Gebruikersnaam"
          autoComplete="username"
          className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submitLocal(); }}
          placeholder="Wachtwoord"
          autoComplete="current-password"
          className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
        />
        <button
          onClick={() => void submitLocal()}
          disabled={busy}
          className="w-full cursor-pointer rounded bg-lime-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
        >
          {busy ? "Bezig…" : "Inloggen"}
        </button>
      </div>
    </div>
  );
}
