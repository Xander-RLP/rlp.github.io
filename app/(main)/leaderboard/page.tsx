"use client";

import Link from "next/link";
import { logoColor } from "@/lib/bracket";
import { computeLeaderboards, type LeaderboardEntry } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";

function Podium({ rank, wins }: { rank: number; wins: number }) {
  // medailles pas als er echt iets gewonnen is
  const medal = wins > 0 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null) : null;
  return medal
    ? <span className="w-7 text-center text-base">{medal}</span>
    : <span className="w-7 text-center text-[11px] font-bold text-slate-500">{rank}</span>;
}

function Board({ title, hint, entries }: { title: string; hint: string; entries: LeaderboardEntry[] }) {
  return (
    <section className="flex-1 basis-72">
      <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-400">{hint}</p>
      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-slate-700 px-3 py-2.5 text-xs italic text-slate-400">
          Nog niets om te tonen.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((e, i) => {
            const top = i === 0 && e.wins > 0;
            return (
              <div
                key={e.name}
                className={`flex items-center gap-2.5 rounded border px-2.5 py-1.5 ${
                  top ? "border-amber-400/60 bg-amber-400/10" : "border-slate-700 bg-slate-800"
                } ${e.wins === 0 ? "opacity-60" : ""}`}
              >
                <Podium rank={i + 1} wins={e.wins} />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(e.name) }}>
                  {e.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{e.name}</div>
                  <div className="truncate text-[10px] text-slate-400">{e.games.join(" · ") || "nog geen compo gewonnen"}</div>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-lime-400">{e.wins}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function LeaderboardPage() {
  const { state } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const { personal, teams } = computeLeaderboards(state);

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Leaderboard</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Automatisch opgebouwd uit de{" "}
        <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">users</Link>,{" "}
        <Link href="/teams" className="font-bold text-lime-400 hover:text-lime-300">teams</Link>{" "}
        en de toernooi-uitslagen — teamwinsten tellen persoonlijk mee voor de teamleden.
      </p>

      <div className="flex flex-wrap gap-7">
        <Board title="🧑 Persoonlijk" hint="Gewonnen compo's per persoon (incl. teamwinsten)." entries={personal} />
        <Board title="👥 Teams" hint="Gewonnen compo's per team." entries={teams} />
      </div>
    </div>
  );
}
