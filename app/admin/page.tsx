"use client";

import Link from "next/link";
import { useState } from "react";
import { useTournament } from "@/lib/store";

export default function AdminPage() {
  const { staticMode, isAdmin, login, logout } = useTournament();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await login(username, password);
    setBusy(false);
    setError(!ok);
    if (ok) {
      setUsername("");
      setPassword("");
    }
  }

  if (staticMode) {
    return (
      <div>
        <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
        <div className="max-w-xl rounded-md border border-dashed border-slate-700 bg-slate-800 p-6 text-[13px] leading-relaxed text-slate-400">
          Beheren kan alleen lokaal: start <code className="text-lime-400">python3 server.py</code> en{" "}
          <code className="text-lime-400">npm run dev</code>, en open daar <code className="text-lime-400">/admin</code>.
          Deze publieke site is read-only en wordt bijgewerkt door te pushen.
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div>
        <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Admin</h2>
        <div className="max-w-xl rounded-md border border-slate-700 bg-slate-800 p-6">
          <p className="mb-4 text-[13px] text-slate-300">
            ✅ Je bent ingelogd als admin. Je kunt nu overal bewerken:
          </p>
          <ul className="mb-5 space-y-1.5 text-[13px] text-slate-400">
            <li>• <Link href="/" className="text-lime-400 hover:underline">Brackets</Link> — deelnemers, scores, bracket-grootte, spellen toevoegen</li>
            <li>• <Link href="/schedule" className="text-lime-400 hover:underline">Schedule</Link> — datum/tijd per toernooi (agenda)</li>
            <li>• <Link href="/seatplan" className="text-lime-400 hover:underline">Seatplan</Link> — bezette stoelen vrijgeven</li>
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
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          placeholder="Wachtwoord"
          autoComplete="current-password"
          className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
        />
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="w-full cursor-pointer rounded bg-lime-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
        >
          {busy ? "Bezig…" : "Inloggen"}
        </button>
      </div>
    </div>
  );
}
