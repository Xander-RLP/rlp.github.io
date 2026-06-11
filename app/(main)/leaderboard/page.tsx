"use client";

import Link from "next/link";
import CoffeeHint from "@/components/CoffeeHint";
import { logoColor } from "@/lib/bracket";
import { computeLeaderboards, pairKey, pairsPlayed, type LeaderboardEntry } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";
import { allUsers } from "@/lib/users";

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
  const users = allUsers(state);
  const played = pairsPlayed(state);
  const totalPairs = (users.length * (users.length - 1)) / 2;
  const playedPairs = users.flatMap((a, i) => users.slice(i + 1).map((b) => pairKey(a, b)))
    .filter((k) => played.has(k)).length;

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Leaderboard</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Automatisch opgebouwd uit de{" "}
        <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">users</Link>,{" "}
        <Link href="/teams" className="font-bold text-lime-400 hover:text-lime-300">teams</Link>{" "}
        en de toernooi-uitslagen — teamwinsten tellen persoonlijk mee voor de teamleden.
      </p>

      <div className="mb-3 flex flex-wrap gap-7">
        <Board title="🧑 Persoonlijk" hint="Gewonnen compo's per persoon (incl. teamwinsten)." entries={personal} />
        <Board title="👥 Teams" hint="Gewonnen compo's per team." entries={teams} />
      </div>

      {/* piekmoment: er staat iemand op het bord — hét moment voor een knipoog */}
      {personal[0]?.wins > 0 && (
        <div className="mb-8">
          <CoffeeHint>
            🥇 Er staan al winnaars op het bord! Werkt het systeem lekker? Denk dan ook eens aan de developer —
          </CoffeeHint>
        </div>
      )}

      {/* analytisch: wie heeft al met wie samengespeeld (uit de team-inschrijvingen per compo) */}
      {users.length > 1 && (
        <section>
          <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">🤝 Samen gespeeld</h3>
          <p className="mb-3 text-[11px] text-slate-400">
            Automatisch afgeleid uit de team-inschrijvingen per compo — het getal is het aantal compo&apos;s samen.{" "}
            <b className={playedPairs === totalPairs ? "text-lime-400" : "text-amber-400"}>
              {playedPairs}/{totalPairs}
            </b>{" "}
            duo&apos;s hebben al eens samengespeeld
            {playedPairs === totalPairs ? " — iedereen heeft met iedereen gespeeld! 🎉" : "."}
          </p>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {users.map((u) => (
                    <th key={u} className="p-0">
                      <span title={u} className="flex h-7 w-7 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(u) }}>
                        {u.slice(0, 2).toUpperCase()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((a, i) => (
                  <tr key={a}>
                    <th className="p-0 pr-1 text-right text-[11px] font-bold text-slate-300">{a}</th>
                    {users.map((b, j) => {
                      if (i === j) return <td key={b} className="h-7 w-7 rounded bg-slate-900" />;
                      const games = played.get(pairKey(a, b));
                      return (
                        <td
                          key={b}
                          title={games ? `${a} + ${b}: ${games.join(", ")}` : `${a} en ${b} hebben nog niet samengespeeld`}
                          className={`h-7 w-7 rounded text-center text-[11px] font-extrabold ${
                            games ? "bg-lime-400/25 text-lime-300" : "bg-slate-800 text-slate-600"
                          }`}
                        >
                          {games ? games.length : "·"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
