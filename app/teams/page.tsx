"use client";

import GameHeading from "@/components/GameHeading";
import { logoColor, seedPairs } from "@/lib/bracket";
import { useTournament } from "@/lib/store";

export default function TeamsPage() {
  const { state } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Teams</h2>
      <p className="mb-5 text-[13px] text-slate-400">Aangemelde teams en spelers per toernooi.</p>

      {state.games.map((g) => {
        const pairs = seedPairs(g.bracket.rounds[0].length * 2);
        const entries: { seed: number; name: string }[] = [];
        g.bracket.rounds[0].forEach((m, mi) =>
          m.teams.forEach((t, si) => {
            if (t.name) entries.push({ seed: pairs[mi][si], name: t.name });
          })
        );
        return (
          <section key={g.id} className="mb-7">
            <GameHeading game={g} />
            {entries.length === 0 ? (
              <p className="text-xs italic text-slate-400">Nog geen aanmeldingen.</p>
            ) : (
              <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {entries.map((e) => (
                  <div key={`${e.seed}-${e.name}`} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold">
                    <span className="text-[10px] text-slate-400">{e.seed}</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(e.name) }}>
                      {e.name.slice(0, 2).toUpperCase()}
                    </span>
                    {e.name}
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
