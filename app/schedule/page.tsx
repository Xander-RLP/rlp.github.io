"use client";

import GameHeading from "@/components/GameHeading";
import { allMatches } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { Game } from "@/lib/types";

function formatStart(start?: string): string | null {
  if (!start) return null;
  const d = new Date(start);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default function SchedulePage() {
  const { state, isAdmin, updateGames } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  function setStart(game: Game, value: string) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, start: value || undefined } : g)));
  }

  // agenda: toernooien met tijd chronologisch, rest ("tijd volgt") onderaan
  const ordered = [...state.games].sort((a, b) => {
    if (!a.start && !b.start) return 0;
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Schedule</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        De agenda van RLP26: wanneer welk toernooi speelt, plus alle matches en uitslagen.
      </p>

      {ordered.map((g) => {
        const matches = allMatches([g]);
        const startLabel = formatStart(g.start);
        return (
          <section key={g.id} className="mb-7">
            <GameHeading game={g} />
            <div className="mb-2.5 flex flex-wrap items-center gap-3 text-xs">
              <span className={startLabel ? "font-bold text-lime-400" : "italic text-slate-400"}>
                📅 {startLabel ?? "Tijd volgt"}
              </span>
              {isAdmin && (
                <input
                  type="datetime-local"
                  value={g.start ?? ""}
                  onChange={(e) => setStart(g, e.target.value)}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:border-lime-400 focus:outline-none"
                />
              )}
            </div>
            {matches.length === 0 ? (
              <p className="text-xs italic text-slate-400">Nog geen matches — deelnemers worden nog ingedeeld.</p>
            ) : (
              <div className="max-w-2xl overflow-hidden rounded border border-slate-700">
                {matches.map((m, i) => (
                  <div key={i} className="grid grid-cols-[56px_1fr_auto_1fr] items-center gap-2.5 border-t border-slate-700 bg-slate-800 px-3.5 py-2 text-[13px] first:border-t-0">
                    <span className="text-[10px] font-extrabold tracking-wide text-slate-400">{m.round}</span>
                    <span className={`truncate text-right font-semibold ${m.decided && m.winner === 0 ? "text-lime-400" : ""}`}>{m.a}</span>
                    <span className={`text-[11px] font-extrabold ${m.decided ? "text-lime-400" : "text-slate-400"}`}>
                      {m.decided ? `${m.scoreA} – ${m.scoreB}` : "VS"}
                    </span>
                    <span className={`truncate font-semibold ${m.decided && m.winner === 1 ? "text-lime-400" : ""}`}>{m.b}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
