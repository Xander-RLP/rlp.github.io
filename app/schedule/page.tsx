"use client";

import { allMatches, gameInitials, gameStatus, logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { Game } from "@/lib/types";

function dayKey(start: string): string {
  return new Date(start).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function timeLabel(start: string): string {
  return new Date(start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function SchedulePage() {
  const { state, isAdmin, updateGames } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  function setStart(game: Game, value: string) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, start: value || undefined } : g)));
  }

  const scheduled = state.games
    .filter((g) => g.start && !isNaN(new Date(g.start).getTime()))
    .sort((a, b) => a.start!.localeCompare(b.start!));
  const unscheduled = state.games.filter((g) => !scheduled.includes(g));

  const days = new Map<string, Game[]>();
  for (const g of scheduled) {
    const key = dayKey(g.start!);
    days.set(key, [...(days.get(key) ?? []), g]);
  }

  function EventCard({ game, showTime }: { game: Game; showTime: boolean }) {
    const st = gameStatus(game);
    const matches = allMatches([game]);
    const participants = game.type === "race"
      ? game.race?.participants.length ?? 0
      : game.bracket.rounds[0].flatMap((m) => m.teams).filter((t) => t.name).length;
    return (
      <div className="relative">
        {/* stip op de tijdlijn */}
        <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-lime-400 bg-slate-950" />
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {showTime && (
              <div className="w-14 text-lg font-extrabold text-lime-400">{timeLabel(game.start!)}</div>
            )}
            {game.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={game.image} alt="" className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md text-xs font-extrabold text-slate-950" style={{ background: logoColor(game.name) }}>
                {gameInitials(game.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold">{game.name}</div>
              <div className="truncate text-[11px] text-slate-400">{game.format ?? ""}</div>
            </div>
            <div className="text-right text-xs">
              <div className={`font-bold ${st.champ ? "text-amber-400" : "text-lime-400"}`}>{st.text}</div>
              <div className="text-slate-400">{participants} deelnemers</div>
            </div>
            {isAdmin && (
              <input
                type="datetime-local"
                value={game.start ?? ""}
                onChange={(e) => setStart(game, e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:border-lime-400 focus:outline-none"
              />
            )}
          </div>
          {matches.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-lime-400">
                Matches &amp; uitslagen ({matches.length})
              </summary>
              <div className="mt-2 overflow-hidden rounded border border-slate-700">
                {matches.map((m, i) => (
                  <div key={i} className="grid grid-cols-[44px_1fr_auto_1fr] items-center gap-2 border-t border-slate-700 bg-slate-900 px-3 py-1.5 text-xs first:border-t-0">
                    <span className="text-[9px] font-extrabold tracking-wide text-slate-500">{m.round}</span>
                    <span className={`truncate text-right font-semibold ${m.decided && m.winner === 0 ? "text-lime-400" : ""}`}>{m.a}</span>
                    <span className={`text-[10px] font-extrabold ${m.decided ? "text-lime-400" : "text-slate-500"}`}>
                      {m.decided ? `${m.scoreA} – ${m.scoreB}` : "VS"}
                    </span>
                    <span className={`truncate font-semibold ${m.decided && m.winner === 1 ? "text-lime-400" : ""}`}>{m.b}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Schedule</h2>
      <p className="mb-6 text-[13px] text-slate-400">
        De agenda van RLP26 — per dag, op tijd.
        {isAdmin && " Als admin stel je hier de tijden in."}
      </p>

      {days.size === 0 && (
        <p className="mb-6 text-sm italic text-slate-400">Nog niets ingepland — tijden volgen zodra de aanmeldingen rond zijn.</p>
      )}

      {[...days.entries()].map(([day, games]) => (
        <section key={day} className="mb-8">
          <h3 className="mb-4 flex items-center gap-3 text-base font-extrabold uppercase tracking-wide">
            <span className="rounded bg-lime-400 px-2.5 py-1 text-xs text-lime-950">📅</span>
            {day}
          </h3>
          <div className="ml-2 space-y-4 border-l-2 border-slate-700 pl-6">
            {games.map((g) => <EventCard key={g.id} game={g} showTime />)}
          </div>
        </section>
      ))}

      {unscheduled.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-4 text-base font-extrabold uppercase tracking-wide text-slate-400">
            Nog in te plannen
          </h3>
          <div className="ml-2 space-y-4 border-l-2 border-dashed border-slate-700 pl-6">
            {unscheduled.map((g) => <EventCard key={g.id} game={g} showTime={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}
