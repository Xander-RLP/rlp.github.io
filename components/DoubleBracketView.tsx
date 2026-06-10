"use client";

import { logoColor, propagateDouble, winnerIdx } from "@/lib/bracket";
import type { DoubleBracket, Game, Match } from "@/lib/types";

type SlotKey = "w1-0" | "w1-1" | "wf" | "l1" | "lf" | "gf";

type Props = {
  game: Game;
  isAdmin: boolean;
  onDoubleChange: (double: DoubleBracket) => void;
};

const SEEDS: Record<string, [number, number]> = { "w1-0": [1, 4], "w1-1": [2, 3] };

export default function DoubleBracketView({ game, isAdmin, onDoubleChange }: Props) {
  const d = propagateDouble(game.double ?? { w1: [emptyM(), emptyM()], wf: emptyM(), l1: emptyM(), lf: emptyM(), gf: emptyM() });

  function emptyM(): Match {
    return { teams: [{ name: "", score: null }, { name: "", score: null }] };
  }

  function getMatch(dd: DoubleBracket, key: SlotKey): Match {
    if (key === "w1-0") return dd.w1[0];
    if (key === "w1-1") return dd.w1[1];
    return dd[key];
  }

  function mutate(key: SlotKey, fn: (m: Match) => void) {
    const next: DoubleBracket = JSON.parse(JSON.stringify(propagateDouble(game.double!)));
    fn(getMatch(next, key));
    onDoubleChange(next);
  }

  function MatchCard({ matchKey, label, highlight = false }: { matchKey: SlotKey; label: string; highlight?: boolean }) {
    const match = getMatch(d, matchKey);
    const w = winnerIdx(match);
    const editableNames = isAdmin && matchKey.startsWith("w1");
    const bothNamed = !!(match.teams[0].name && match.teams[1].name);
    return (
      <div>
        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{label}</div>
        <div className={`w-56 rounded border bg-slate-800 ${highlight ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.15)]" : "border-slate-700"}`}>
          {match.teams.map((team, s) => {
            const won = w === s;
            const lost = w >= 0 && w !== s;
            const seed = SEEDS[matchKey]?.[s];
            return (
              <div key={s} className={`flex min-h-9 items-center gap-2 px-2.5 py-1.5 ${s === 1 ? "border-t border-slate-700" : ""} ${won ? "bg-slate-700/60" : ""}`}>
                <span className="w-3.5 shrink-0 text-right text-[10px] text-slate-400">{seed ?? ""}</span>
                {team.name ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(team.name) }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded bg-slate-700" />
                )}
                {editableNames ? (
                  <input
                    value={team.name}
                    maxLength={24}
                    placeholder="Naam"
                    onChange={(e) => mutate(matchKey, (m) => { m.teams[s].name = e.target.value.trim(); })}
                    className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
                  />
                ) : (
                  <span className={`min-w-0 flex-1 truncate text-xs ${team.name ? (won ? "font-bold text-slate-100" : lost ? "font-semibold text-slate-400" : "font-semibold") : "italic text-slate-400"}`}>
                    {team.name || "TBD"}
                  </span>
                )}
                {isAdmin && bothNamed ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={team.score ?? ""}
                    placeholder="-"
                    onChange={(e) => mutate(matchKey, (m) => {
                      m.teams[s].score = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                    })}
                    className="w-10 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-center text-xs font-bold [appearance:textfield] focus:border-lime-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span className={`w-5 text-center text-[13px] font-extrabold ${won ? "text-lime-400" : lost ? "text-slate-400" : ""}`}>
                    {team.score ?? "–"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const champ = winnerIdx(d.gf);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        {/* winners + losers bracket */}
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-lime-400">🏆 Winners Bracket</h3>
            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-4">
                <MatchCard matchKey="w1-0" label="Ronde 1" />
                <MatchCard matchKey="w1-1" label="Ronde 1" />
              </div>
              <MatchCard matchKey="wf" label="Winners Finale" />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-red-400">💀 Losers Bracket</h3>
            <div className="flex items-center gap-8">
              <MatchCard matchKey="l1" label="Ronde 1 — verliezers" />
              <MatchCard matchKey="lf" label="Losers Finale" />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Verlies je in het winners bracket, dan krijg je hier een tweede kans.
            </p>
          </section>
        </div>

        {/* grand final */}
        <section className="lg:pl-4">
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-amber-400">⚔️ Grand Final</h3>
          <MatchCard matchKey="gf" label="WB-winnaar vs LB-winnaar" highlight />
          {champ >= 0 && (
            <div className="mt-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
              🏆 Champion: {d.gf.teams[champ].name}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
