"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { logoColor, propagateDouble, winnerIdx } from "@/lib/bracket";
import type { DoubleBracket, Game, Match } from "@/lib/types";

type SlotKey = "w1-0" | "w1-1" | "wf" | "l1" | "lf" | "gf";

type Line = { left: number; top: number; width: number; height: number; loser?: boolean };

type Props = {
  game: Game;
  isAdmin: boolean;
  onDoubleChange: (double: DoubleBracket) => void;
};

const SEEDS: Record<string, [number, number]> = { "w1-0": [1, 4], "w1-1": [2, 3] };
// winnaars stromen naar rechts; verliezers vallen (zonder lijn) het losers bracket in
const WINNER_FEEDS: [SlotKey, SlotKey][] = [["w1-0", "wf"], ["w1-1", "wf"], ["l1", "lf"], ["wf", "gf"], ["lf", "gf"]];

export default function DoubleBracketView({ game, isAdmin, onDoubleChange }: Props) {
  const d = propagateDouble(game.double!);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef(new Map<SlotKey, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);

  function getMatch(dd: DoubleBracket, key: SlotKey): Match {
    if (key === "w1-0") return dd.w1[0];
    if (key === "w1-1") return dd.w1[1];
    return dd[key];
  }

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const next: Line[] = [];
    const rect = (key: SlotKey) => matchRefs.current.get(key)?.getBoundingClientRect();

    for (const [from, to] of WINNER_FEEDS) {
      const src = rect(from), dst = rect(to);
      if (!src || !dst) continue;
      const srcY = src.top + src.height / 2 - origin.top;
      const dstY = dst.top + dst.height / 2 - origin.top;
      const srcX = src.right - origin.left;
      const dstX = dst.left - origin.left;
      const midX = (srcX + dstX) / 2;
      next.push({ left: srcX, top: srcY, width: midX - srcX, height: 1.5 });
      next.push({ left: midX, top: Math.min(srcY, dstY), width: 1.5, height: Math.abs(dstY - srcY) || 1.5 });
      next.push({ left: midX, top: dstY, width: dstX - midX, height: 1.5 });
    }
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAdmin]);

  useLayoutEffect(recompute, [recompute]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

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
      <div className="relative z-10">
        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{label}</div>
        <div
          ref={(el) => { if (el) matchRefs.current.set(matchKey, el); }}
          className={`w-56 rounded border bg-slate-800 ${highlight ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.15)]" : "border-slate-700"}`}
        >
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
    <div className="overflow-x-auto pb-2">
      <div ref={containerRef} className="relative inline-grid grid-cols-[auto_auto_auto] items-center gap-x-12 gap-y-10">
        {lines.map((l, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute ${l.loser ? "bg-red-400/30" : "bg-lime-500/40"}`}
            style={{ left: l.left, top: l.top, width: Math.max(l.width, 1.5), height: Math.max(l.height, 1.5) }}
          />
        ))}

        {/* winners bracket */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-lime-400">🏆 Winners Bracket</h3>
          <MatchCard matchKey="w1-0" label="Ronde 1" />
          <MatchCard matchKey="w1-1" label="Ronde 1" />
        </div>
        <MatchCard matchKey="wf" label="Winners Finale" />
        <div className="row-span-2 self-center">
          <MatchCard matchKey="gf" label="⚔️ Grand Final" highlight />
          {champ >= 0 && (
            <div className="mt-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
              🏆 Champion: {d.gf.teams[champ].name}
            </div>
          )}
        </div>

        {/* losers bracket */}
        <div className="flex flex-col gap-4 self-start">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-red-400">💀 Losers Bracket</h3>
          <MatchCard matchKey="l1" label="Ronde 1 — verliezers" />
        </div>
        <MatchCard matchKey="lf" label="Losers Finale" />
      </div>
      <p className="mt-3 max-w-xl text-[11px] text-slate-500">
        Verlies je in het winners bracket, dan krijg je in het losers bracket een tweede kans.
        De winnaar daarvan speelt de Grand Final tegen de winnaar van het winners bracket.
      </p>
    </div>
  );
}
